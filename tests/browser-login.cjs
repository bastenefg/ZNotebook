// Run with Node and Playwright available through NODE_PATH (or PLAYWRIGHT_MODULE).
// All browser requests are intercepted; this never contacts Google or a live backend.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const root = path.resolve(__dirname, "..");
const screenshotDir = process.env.SCREENSHOT_DIR || fs.mkdtempSync(path.join(os.tmpdir(), "notebook-login-"));
fs.mkdirSync(screenshotDir, { recursive: true });
const origin = "http://127.0.0.1:45873";
const backend = "https://notebook-backend.invalid";
const credentialKey = "definitely-not-notion-backend-credential-v1";
const token = `header.${Buffer.from(JSON.stringify({ sub: "test-user", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.signature`;
const fixture = {
  taxonomy: {
    statuses: [{ value: "in-progress", label: "In progress" }],
    outcomes: [{ value: "pending", label: "Pending" }],
    labels: [],
    sections: [{ id: "experiments", name: "Experiment", columns: [], customFields: [] }],
  },
  records: [
    { id: "saved-record", sectionId: "experiments", title: "Existing Drive record", status: "in-progress", outcome: "pending", labels: ["preserve"], summary: "Saved before login", content: "<p>Keep this original content.</p>", customFields: {}, createdAt: "2026-08-01T10:00:00Z", updatedAt: "2026-08-02T10:00:00Z" },
    { id: "saved-trash", sectionId: "experiments", title: "Previously archived record", status: "in-progress", outcome: "pending", labels: [], summary: "", content: "<p>Keep archived content too.</p>", customFields: {}, createdAt: "2026-08-01T10:00:00Z", updatedAt: "2026-08-02T10:00:00Z", deletedAt: "2026-08-03T10:00:00Z" },
  ],
  recordMeta: { "saved-record": { modifiedTime: "2026-08-02T10:00:00Z" }, "saved-trash": { modifiedTime: "2026-08-02T10:00:00Z" } },
};

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

async function session(browser, width, { automatic = true, workspaceResponse } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, serviceWorkers: "block" });
  const requests = [];
  const unexpected = [];
  const errors = [];
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await context.addInitScript(({ automatic, token, credentialKey }) => {
    if (automatic) localStorage.setItem(credentialKey, token);
    window.__signInCount = 0;
    window.google = { accounts: { id: {
      initialize(options) { window.__googleCallback = options.callback; },
      renderButton(container) {
        const button = document.createElement("button");
        button.textContent = "Sign in with test Google";
        button.addEventListener("click", () => {
          window.__signInCount += 1;
          window.__googleCallback({ credential: token });
        });
        container.append(button);
      },
    } } };
  }, { automatic, token, credentialKey });
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === origin) {
      const name = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      if (name === "config.js") {
        await route.fulfill({ contentType: "application/javascript", body: `window.DEFINITELY_NOT_NOTION_CONFIG = ${JSON.stringify({ googleClientId: "test-client", backendUrl: backend })};` });
      } else if (["index.html", "app.js", "styles.css"].includes(name)) {
        const body = fs.readFileSync(path.join(root, name), "utf8").replace(/<link rel="preconnect"[^>]*>/g, "");
        await route.fulfill({ body, contentType: name.endsWith(".js") ? "application/javascript" : name.endsWith(".css") ? "text/css" : "text/html" });
      } else if (name === "favicon.ico") {
        await route.fulfill({ status: 204 });
      } else {
        unexpected.push(request.url());
        await route.abort();
      }
      return;
    }
    if (url.origin === backend) {
      requests.push({ path: url.pathname, method: request.method(), authorization: request.headers().authorization });
      if (url.pathname === "/health") {
        await route.fulfill({ json: { ok: true } });
      } else if (url.pathname === "/workspace" && request.method() === "GET") {
        await workspaceResponse(route, requests.filter((item) => item.path === "/workspace").length);
      } else {
        unexpected.push(`${request.method()} ${request.url()}`);
        await route.abort();
      }
      return;
    }
    unexpected.push(request.url());
    await route.abort();
  });
  await page.goto(origin);
  await page.locator("main").waitFor();
  return {
    page, requests,
    async finish() {
      assert.deepEqual(unexpected, [], "all requests must match the isolated local fixture");
      assert.deepEqual(errors, [], "no browser runtime errors");
      assert.ok(requests.every((request) => request.method === "GET"), "login must not change data on Drive");
      await context.close();
    },
  };
}

async function assertConnected(page) {
  await page.waitForFunction(() => driveState.connected && !driveState.connecting);
  await page.getByText("Existing Drive record", { exact: true }).waitFor();
  const records = await page.evaluate(() => getAllExperiments());
  assert.deepEqual(records.sort((a, b) => a.id.localeCompare(b.id)), [...fixture.records].sort((a, b) => a.id.localeCompare(b.id)), "snapshot preserves existing and archived records exactly");
  assert.equal(await page.locator("main").getAttribute("aria-busy"), "false");
}

async function assertProgress(page, selector, width) {
  const feedback = page.locator(selector);
  await feedback.waitFor({ state: "visible" });
  await feedback.locator(".connection-indicator.is-spinning").waitFor({ state: "visible" });
  assert.match(await feedback.innerText(), /Connecting to Drive|Retrying connection/);
  const box = await feedback.boundingBox();
  assert.ok(box && box.x >= 0 && box.x + box.width <= width + 1, "feedback fits the viewport");
  assert.equal(await page.locator("main").getAttribute("aria-busy"), "true");
  assert.equal(await page.locator("main").evaluate((element) => element.inert), true);
}

(async () => {
  const executablePath = process.env.BROWSER_EXECUTABLE;
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  try {
    for (const width of [390, 320, 1280]) {
      const pending = deferred();
      const env = await session(browser, width, { workspaceResponse: async (route) => { await pending.promise; await route.fulfill({ json: fixture }); } });
      await assertProgress(env.page, "#app > [data-connection-feedback]", width);
      await env.page.screenshot({ path: path.join(screenshotDir, `connecting-${width}.png`), fullPage: true });
      pending.resolve();
      await assertConnected(env.page);
      assert.equal(env.requests.filter((request) => request.path === "/workspace").length, 1);
      assert.equal(await env.page.evaluate(() => window.__signInCount), 0);
      await env.finish();
      console.log(`PASS automatic login and preserved records at ${width}px`);
    }

    {
      const pending = deferred();
      const env = await session(browser, 390, { automatic: false, workspaceResponse: async (route) => { await pending.promise; await route.fulfill({ json: fixture }); } });
      await env.page.locator("[data-action='drive-settings']").click();
      await env.page.getByRole("button", { name: "Sign in with test Google" }).click();
      await assertProgress(env.page, "[data-drive-dialog] [data-connection-feedback]", 390);
      assert.equal(await env.page.locator("[data-drive-dialog]").isVisible(), true, "sign-in dialog stays open while loading");
      assert.equal(await env.page.locator("[data-google-signin]").isVisible(), false);
      await env.page.screenshot({ path: path.join(screenshotDir, "dialog-connecting-390.png"), fullPage: true });
      pending.resolve();
      await assertConnected(env.page);
      await env.page.locator("[data-drive-dialog]").waitFor({ state: "detached" });
      assert.equal(await env.page.evaluate(() => window.__signInCount), 1);
      await env.finish();
      console.log("PASS interactive sign-in keeps progress visible and closes after success");
    }

    for (const failure of ["503", "network"]) {
      const env = await session(browser, 320, { workspaceResponse: async (route, count) => {
        if (count > 2) await route.fulfill({ json: fixture });
        else if (failure === "network") await route.abort("failed");
        else await route.fulfill({ status: 503, json: { error: "Storage service is temporarily unavailable" } });
      } });
      const retry = env.page.getByRole("button", { name: "Retry connection", exact: true });
      await retry.waitFor({ state: "visible" });
      const retryBox = await retry.boundingBox();
      const copyBox = await env.page.locator("#app > [data-connection-feedback] .connection-copy").boundingBox();
      assert.ok(retryBox.y >= copyBox.y + copyBox.height, "the mobile retry button has its own row so error text remains readable");
      assert.equal(await env.page.evaluate((key) => localStorage.getItem(key), credentialKey), token);
      assert.equal(env.requests.filter((request) => request.path === "/workspace").length, 2, "transient reads are retried once automatically");
      await env.page.screenshot({ path: path.join(screenshotDir, `retry-${failure}-320.png`), fullPage: true });
      await retry.click();
      await assertConnected(env.page);
      assert.equal(await env.page.evaluate(() => window.__signInCount), 0, "retry does not require another Google sign-in");
      assert.ok(env.requests.filter((request) => request.path === "/workspace").every((request) => request.authorization === `Bearer ${token}`));
      await env.finish();
      console.log(`PASS ${failure} retry uses the existing sign-in`);
    }
    console.log(`Screenshots: ${screenshotDir}`);
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
