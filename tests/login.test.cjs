const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
const startupIndex = source.lastIndexOf("init().catch(");
assert.ok(startupIndex > 0, "The app startup boundary must be found.");
const appSource = source.slice(0, startupIndex);
const credentialKey = "definitely-not-notion-backend-credential-v1";

function credential(subject) {
  return `header.${Buffer.from(JSON.stringify({ sub: subject, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.signature`;
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function response(status = 200, body = { taxonomy: {}, records: [], recordMeta: {} }) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function element() {
  const classes = new Set();
  return {
    innerHTML: "", hidden: false, disabled: false, inert: false, isConnected: true, attributes: {},
    classList: { toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); }, contains: (name) => classes.has(name) },
    setAttribute(name, value) { this.attributes[name] = value; },
    querySelector: () => null,
    addEventListener() {},
  };
}

function harness(fetchImplementation) {
  const saved = new Map();
  const calls = [];
  const snapshots = [];
  const timeoutCallbacks = new Map();
  let timerId = 0;
  let signinCallback;
  let routeCount = 0;
  const feedback = element();
  const storage = element();
  const page = element();
  const button = element();
  const backupButton = element();
  const app = element();
  app.querySelector = (selector) => selector === "main" ? page : button;
  const document = {
    getElementById: () => app,
    querySelector: () => null,
    querySelectorAll(selector) {
      if (selector === "[data-connection-feedback]") return [feedback];
      if (selector === ".storage-state") return [storage];
      if (selector === "[data-action='drive-sync'], [data-action='backup']") return [button, backupButton];
      return [];
    },
  };
  const timer = (callback, delay) => {
    if (delay >= 10000) {
      const id = ++timerId;
      timeoutCallbacks.set(id, callback);
      return id;
    }
    return setTimeout(callback, 0);
  };
  const clearTimer = (id) => {
    if (!timeoutCallbacks.delete(id)) clearTimeout(id);
  };
  const google = { accounts: { id: {
    initialize(options) { signinCallback = options.callback; },
    renderButton() {},
  } } };
  const context = vm.createContext({
    document, google, location: { hash: "#/" },
    localStorage: {
      getItem: (key) => saved.get(key) ?? null,
      setItem: (key, value) => saved.set(key, String(value)),
      removeItem: (key) => saved.delete(key),
    },
    window: {
      DEFINITELY_NOT_NOTION_CONFIG: { googleClientId: "test-client", backendUrl: "https://backend.example" },
      google, setTimeout: timer, clearTimeout: clearTimer,
      alert() {}, addEventListener() {},
    },
    fetch: async (url, options = {}) => {
      calls.push({ url, options });
      return fetchImplementation(url, options, calls.length);
    },
    console: { warn() {}, error() {}, log() {} },
    setTimeout: timer, clearTimeout: clearTimer,
    AbortController, DOMException, URL, Blob, FormData, atob, TypeError,
    __captureSnapshot: async (snapshot) => { snapshots.push(snapshot); },
    __route: async () => { routeCount += 1; },
  });
  vm.runInContext(appSource, context, { filename: "app.js" });
  vm.runInContext("applyWorkspaceSnapshot = __captureSnapshot; route = __route;", context);
  return {
    context, saved, calls, snapshots, feedback, storage, page, app, backupButton,
    state: () => vm.runInContext("driveState", context),
    run: (code) => vm.runInContext(code, context),
    callback: () => signinCallback,
    routeCount: () => routeCount,
    timeoutCallbacks,
  };
}

async function until(condition, description) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  assert.fail(`Timed out waiting for ${description}`);
}

test("a stale automatic sign-in cannot undo a newer successful login", async () => {
  const oldRequest = deferred();
  const newToken = credential("new-session");
  const env = harness((_url, _options, count) => count === 1 ? oldRequest.promise : response());
  env.saved.set(credentialKey, credential("old-session"));
  const automatic = env.context.tryAutoConnectBackend();
  await until(() => env.calls.length === 1, "automatic request");
  await env.context.connectDrive(newToken);
  assert.equal(env.state().connected, true);
  oldRequest.reject(new TypeError("Failed to fetch"));
  await automatic;
  assert.equal(env.state().connected, true);
  assert.equal(env.state().accessToken, newToken);
  assert.equal(env.saved.get(credentialKey), newToken);
  assert.equal(env.snapshots.length, 1);
  assert.equal(env.calls.length, 2, "a superseded attempt must not retry");
});

test("duplicate Google callbacks share one connection request", async () => {
  const pending = deferred();
  const env = harness(() => pending.promise);
  let removed = false;
  await env.context.renderBackendSignIn(element(), { remove() { removed = true; }, querySelector: () => null });
  assert.equal(typeof env.callback(), "function");
  const token = credential("same-session");
  const first = env.callback()({ credential: token });
  const second = env.callback()({ credential: token });
  await until(() => env.calls.length > 0, "Google callback request");
  assert.equal(env.calls.length, 1);
  assert.equal(removed, false, "the dialog remains visible while loading");
  pending.resolve(response());
  await Promise.all([first, second]);
  assert.equal(env.snapshots.length, 1);
  assert.equal(env.state().connected, true);
  assert.equal(removed, true);
});

test("logging in reads the shared notebook without uploading local records", async () => {
  const env = harness(() => response());
  env.run('experiments = [{ id: "private-local-record", content: "local draft" }];');
  await env.context.connectDrive(credential("read-only-login"));
  assert.equal(env.calls.length, 1);
  assert.equal(env.calls[0].url, "https://backend.example/workspace");
  assert.equal(env.calls[0].options.method || "GET", "GET");
  assert.equal(env.calls[0].options.body, undefined);
});

for (const failure of ["network", "service unavailable"]) {
  test(`automatic login preserves a valid credential after ${failure}`, async () => {
    const env = harness(() => {
      if (failure === "network") throw new TypeError("Failed to fetch");
      return response(503, { error: "Storage service is temporarily unavailable" });
    });
    const token = credential("retry-session");
    env.saved.set(credentialKey, token);
    await env.context.tryAutoConnectBackend();
    assert.equal(env.saved.get(credentialKey), token);
    assert.equal(env.state().connected, false);
    assert.equal(env.state().connecting, false);
    assert.ok(env.state().error);
    assert.equal(env.calls.length, 2);
    assert.match(env.feedback.innerHTML, /Retry connection/);
  });
}

test("an unauthorized login removes the rejected credential without retrying", async () => {
  const env = harness(() => response(401, { error: "Sign-in expired" }));
  env.saved.set(credentialKey, credential("expired-session"));
  await env.context.tryAutoConnectBackend();
  assert.equal(env.saved.has(credentialKey), false);
  assert.equal(env.calls.length, 1);
  assert.equal(env.state().connected, false);
  assert.match(env.feedback.innerHTML, /Sign in/);
});

test("a timed-out connection is aborted and retried with the same credential", async () => {
  let firstAborted = false;
  const env = harness((_url, options, count) => {
    if (count > 1) return response();
    return new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => {
        firstAborted = true;
        reject(new DOMException("Request aborted", "AbortError"));
      }, { once: true });
    });
  });
  const token = credential("timeout-session");
  const connecting = env.context.connectDrive(token);
  await until(() => env.calls.length === 1 && env.timeoutCallbacks.size > 0, "connection timeout registration");
  const [id, timeout] = env.timeoutCallbacks.entries().next().value;
  env.timeoutCallbacks.delete(id);
  timeout();
  await connecting;
  assert.equal(firstAborted, true);
  assert.equal(env.calls.length, 2);
  assert.equal(env.calls[1].options.headers.Authorization, `Bearer ${token}`);
  assert.equal(env.state().connected, true);
  assert.equal(env.timeoutCallbacks.size, 0);
});

test("connection feedback remains visible outside the compact mobile toolbar", async () => {
  const pending = deferred();
  const env = harness(() => pending.promise);
  env.context.renderShell('<main class="page"></main>');
  const headerEnd = env.app.innerHTML.indexOf("</header>");
  const feedbackPosition = env.app.innerHTML.indexOf("data-connection-feedback");
  assert.ok(feedbackPosition > headerEnd, "connection feedback has its own visible region below the toolbar");
  const connecting = env.context.connectDrive(credential("mobile-session"));
  await until(() => env.calls.length === 1, "mobile connection request");
  assert.equal(env.feedback.classList.contains("is-active"), true);
  assert.match(env.feedback.innerHTML, /Connecting|Loading/);
  assert.equal(env.page.inert, true, "local edits cannot race with loading the shared snapshot");
  assert.equal(env.backupButton.disabled, true, "backup import cannot race with loading the shared snapshot");
  assert.equal(env.page.attributes["aria-busy"], "true");
  pending.resolve(response());
  await connecting;
  assert.equal(env.page.inert, false);
  assert.equal(env.backupButton.disabled, false);
  assert.equal(env.feedback.classList.contains("is-active"), false);
});

test("a failed Google script load can be retried successfully", async () => {
  const env = harness(() => response());
  const scripts = [];
  env.context.window.google = undefined;
  env.context.document.createElement = () => ({ dataset: {}, removed: false, remove() { this.removed = true; } });
  env.context.document.head = { appendChild(script) { scripts.push(script); } };
  const first = env.context.loadGoogleIdentityScript();
  assert.equal(scripts.length, 1);
  scripts[0].onerror();
  await assert.rejects(first, /Google sign-in could not load/);
  assert.equal(scripts[0].removed, true);
  const retry = env.context.loadGoogleIdentityScript();
  assert.equal(scripts.length, 2, "retry must create a fresh script after the failed load");
  env.context.window.google = env.context.google;
  scripts[1].onload();
  await retry;
  await env.context.loadGoogleIdentityScript();
  assert.equal(scripts.length, 2, "the loaded library is reused");
  assert.equal(env.timeoutCallbacks.size, 0);
});

test("sync saves debounced edits and waits for queued writes before reading Drive", async () => {
  const env = harness(() => response());
  const flushed = deferred();
  const queued = deferred();
  const events = [];
  env.context.__flushed = flushed.promise;
  env.context.__queued = queued.promise;
  env.context.__events = events;
  env.run(`
    driveState.connected = true;
    saveTimer = 700;
    recordSaveQueues.set("another-record", __queued);
    saveActiveExperiment = async () => { __events.push("save"); return __flushed; };
    loadDriveWorkspace = async () => { __events.push("read"); return true; };
  `);
  const syncing = env.context.syncDriveNow();
  assert.deepEqual(events, ["save"]);
  assert.equal(env.page.inert, true);
  flushed.resolve(true);
  await new Promise(setImmediate);
  assert.deepEqual(events, ["save"], "the queued record write must finish before sync reads");
  queued.resolve();
  await syncing;
  assert.deepEqual(events, ["save", "read"]);
  assert.equal(env.routeCount(), 1);
  assert.equal(env.state().syncing, false);
  assert.equal(env.page.inert, false);
});

test("sync preserves unsaved edits when the pending save is cancelled", async () => {
  const env = harness(() => response());
  env.run(`
    driveState.connected = true;
    saveTimer = 701;
    saveActiveExperiment = async () => false;
    loadDriveWorkspace = async () => { throw new Error("Sync must not replace the cancelled edit"); };
  `);
  await env.context.syncDriveNow();
  assert.equal(env.calls.length, 0);
  assert.equal(env.routeCount(), 0);
  assert.equal(env.state().connected, true);
  assert.equal(env.state().syncing, false);
  assert.match(env.state().status, /Sync paused/);
  assert.equal(env.page.inert, false);
});

test("resetting the session ignores a cancelled login that later returns successfully", async () => {
  const pending = deferred();
  const env = harness(() => pending.promise);
  const connecting = env.context.connectDrive(credential("cancelled-session"));
  await until(() => env.calls.length === 1, "request before reset");
  env.context.rememberBackendCredential("");
  env.context.resetDriveState();
  assert.equal(env.calls[0].options.signal.aborted, true);
  pending.resolve(response());
  await connecting;
  assert.equal(env.snapshots.length, 0, "a cancelled login must not replace local records");
  assert.equal(env.routeCount(), 0);
  assert.equal(env.state().connected, false);
  assert.equal(env.state().accessToken, "");
  assert.equal(env.saved.has(credentialKey), false);
});

test("sync ignores a late workspace response after the session has reset", async () => {
  const pending = deferred();
  const env = harness(() => pending.promise);
  env.run('driveState.connected = true; driveState.accessToken = "original-session";');
  const syncing = env.context.syncDriveNow();
  await until(() => env.calls.length === 1, "sync request before reset");
  assert.equal(env.calls[0].options.headers.Authorization, "Bearer original-session");
  env.context.resetDriveState();
  pending.resolve(response());
  await syncing;
  assert.equal(env.snapshots.length, 0, "a stale sync must not replace newly imported local records");
  assert.equal(env.routeCount(), 0);
  assert.equal(env.state().connected, false);
  assert.equal(env.state().status, "Local only");
});

test("an old sync authorization error cannot clear a newer signed-in session", async () => {
  const pending = deferred();
  const env = harness((_url, _options, count) => count === 1 ? pending.promise : response());
  env.run('driveState.connected = true; driveState.accessToken = "original-session";');
  const syncing = env.context.syncDriveNow();
  await until(() => env.calls.length === 1, "old sync request");
  env.context.resetDriveState();
  const newToken = credential("replacement-session");
  await env.context.connectDrive(newToken);
  pending.resolve(response(401, { error: "Old session expired" }));
  await syncing;
  assert.equal(env.state().connected, true);
  assert.equal(env.state().accessToken, newToken);
  assert.equal(env.saved.get(credentialKey), newToken);
  assert.equal(env.snapshots.length, 1);
  assert.equal(env.state().status, "Drive connected");
});
