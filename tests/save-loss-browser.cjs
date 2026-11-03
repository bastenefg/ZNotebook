// Real-browser save durability regression tests. All requests are intercepted:
// synthetic records only, no production Drive/backend credentials or writes.
// Run with PLAYWRIGHT_MODULE and BROWSER_EXECUTABLE, or normal Playwright setup.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const root = path.resolve(__dirname, "..");
const origin = "http://127.0.0.1:45874";
const backend = "https://save-tests.invalid";
const credentialKey = "definitely-not-notion-backend-credential-v1";
const screenshotDir = process.env.SCREENSHOT_DIR || fs.mkdtempSync(path.join(os.tmpdir(), "notebook-save-tests-"));
fs.mkdirSync(screenshotDir, { recursive: true });
const token = `header.${Buffer.from(JSON.stringify({ sub: "synthetic-test-user", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.signature`;
const original = {
  id: "synthetic-edit", recordType: "notebook", sectionId: "experiments",
  title: "Synthetic editable record", startDate: "2026-08-01", status: "in-progress",
  outcome: "pending", labels: ["synthetic"], summary: "Original summary",
  content: "<p>Original synthetic content.</p>", customFields: {},
  createdAt: "2026-08-01T10:00:00Z", updatedAt: "2026-08-02T10:00:00Z",
};
const untouched = { ...original, id: "synthetic-untouched", title: "Untouched synthetic record", content: "<p>Preserve these exact bytes.</p>" };
const archived = { ...original, id: "synthetic-archived", title: "Archived synthetic record", deletedAt: "2026-08-03T10:00:00Z" };
const surgery = {
  id: "synthetic-surgery", recordType: "surgery", sectionId: "__surgeries__",
  title: "Synthetic surgery with existing photos", surgeryDate: "2026-08-01", startDate: "2026-08-01",
  plannedEndpointDays: 14, surgeryNotes: "Original synthetic surgery notes",
  surgeryPhotos: [{ id: "card-photo", name: "Existing surgery card.png", mimeType: "image/png", driveFileId: "synthetic-card-asset", dataUrl: "", createdAt: "2026-08-01T10:00:00Z" }],
  terminationDate: "2026-08-15", terminationNotes: "Preserve existing collection notes",
  terminationPhotos: [{ id: "collection-photo", name: "Existing collection photo.png", mimeType: "image/png", driveFileId: "synthetic-collection-asset", dataUrl: "", createdAt: "2026-08-15T10:00:00Z" }],
  terminatedAt: "2026-08-15T10:00:00Z", createdAt: "2026-08-01T10:00:00Z", updatedAt: "2026-08-15T10:00:00Z",
};
const pixelPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6Zt0AAAAASUVORK5CYII=", "base64");
const fixture = {
  recordWriteProtocol: 2,
  taxonomy: {
    statuses: [{ value: "in-progress", label: "In progress" }],
    outcomes: [{ value: "pending", label: "Pending" }],
    labels: [], sections: [{ id: "experiments", name: "Experiment", columns: [], customFields: [] }],
  },
  records: [original, untouched, archived],
  recordMeta: Object.fromEntries([original, untouched, archived].map((record) => [record.id, { modifiedTime: "base-v1", revision: `revision-${record.id}-1` }])),
};
const clone = (value) => JSON.parse(JSON.stringify(value));
function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}
async function reached(signal, label) {
  let timer;
  try {
    await Promise.race([
      signal.promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`Timed out waiting for ${label}`)), 15000); }),
    ]);
  } finally { clearTimeout(timer); }
}

async function session(browser, { automatic = true, localOnly = false, seedV1, onPut, onWorkspace, width = 390, workspace = fixture } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, serviceWorkers: "block" });
  const page = await context.newPage();
  const state = { remote: clone(workspace), puts: [], reads: 0, assets: [], offline: false, unexpected: [], errors: [], dialogs: [] };
  page.on("pageerror", (error) => state.errors.push(error.message));
  page.on("dialog", async (dialog) => {
    state.dialogs.push(dialog.message());
    if (dialog.type() === "beforeunload") await dialog.accept();
    else await dialog.dismiss();
  });
  await context.addInitScript(({ automatic, token, credentialKey }) => {
    if (automatic) localStorage.setItem(credentialKey, token);
    window.google = { accounts: { id: { initialize() {}, renderButton() {} } } };
  }, { automatic, token, credentialKey });

  function accept(payload) {
    assert.equal(payload.force, false, "save-loss recovery must never force-overwrite a record");
    assert.equal(payload.writeProtocol, 2);
    const index = state.remote.records.findIndex((record) => record.id === payload.record.id);
    if (index >= 0) {
      assert.equal(payload.lastKnownModifiedTime, state.remote.recordMeta[payload.record.id].modifiedTime,
        "a retry must retain or deliberately advance the correct acknowledged baseline");
      assert.equal(payload.baseRevision, state.remote.recordMeta[payload.record.id].revision, "a save must retain the exact acknowledged remote revision");
      state.remote.records[index] = clone(payload.record);
    } else {
      assert.equal(payload.lastKnownModifiedTime, "");
      assert.equal(payload.baseRevision, "");
      state.remote.records.push(clone(payload.record));
    }
    const modifiedTime = `accepted-v${state.puts.length + 1}`;
    const revision = `revision-${payload.record.id}-${state.puts.length + 1}`;
    state.remote.recordMeta[payload.record.id] = { modifiedTime, revision };
    return { ok: true, modifiedTime, revision };
  }

  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === origin) {
      const name = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      if (name === "blank.html") await route.fulfill({ body: "<!doctype html><title>Isolated database setup</title>", contentType: "text/html" });
      else if (name === "config.js") await route.fulfill({ contentType: "application/javascript", body: `window.DEFINITELY_NOT_NOTION_CONFIG = ${JSON.stringify(localOnly ? {} : { googleClientId: "test-client", backendUrl: backend })};` });
      else if (["index.html", "app.js", "persistence.js", "styles.css"].includes(name)) {
        const body = fs.readFileSync(path.join(root, name), "utf8").replace(/<link rel="preconnect"[^>]*>/g, "");
        await route.fulfill({ body, contentType: name.endsWith(".js") ? "application/javascript" : name.endsWith(".css") ? "text/css" : "text/html" });
      } else if (name === "favicon.ico") await route.fulfill({ status: 204 });
      else { state.unexpected.push(request.url()); await route.abort(); }
      return;
    }
    if (url.origin === backend) {
      if (url.pathname === "/health" && request.method() === "GET") await route.fulfill({ json: { ok: true } });
      else if (["/assets/synthetic-card-asset", "/assets/synthetic-collection-asset"].includes(url.pathname) && request.method() === "GET") {
        state.assets.push(url.pathname);
        await route.fulfill({ contentType: "image/png", body: pixelPng });
      }
      else if (url.pathname === "/workspace" && request.method() === "GET") {
        state.reads += 1;
        if (state.offline) await route.fulfill({ status: 503, json: { error: "Synthetic offline test" } });
        else if (onWorkspace) await onWorkspace({ route, state, snapshot: clone(state.remote) });
        else await route.fulfill({ json: clone(state.remote) });
      } else if (/^\/records\/[^/]+$/.test(url.pathname) && request.method() === "PUT") {
        const payload = request.postDataJSON();
        state.puts.push(clone(payload));
        if (onPut) await onPut({ route, payload, state, accept });
        else await route.fulfill({ json: accept(payload) });
      } else { state.unexpected.push(`${request.method()} ${request.url()}`); await route.abort(); }
      return;
    }
    state.unexpected.push(request.url());
    await route.abort();
  });
  if (seedV1) {
    await page.goto(`${origin}/blank.html`);
    await page.evaluate((records) => new Promise((resolve, reject) => {
      const request = indexedDB.open("labbook-db", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("experiments", { keyPath: "id" });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction("experiments", "readwrite");
        records.forEach((record) => transaction.objectStore("experiments").put(record));
        transaction.onerror = () => reject(transaction.error);
        transaction.oncomplete = () => { database.close(); resolve(); };
      };
    }), seedV1);
  }
  await page.goto(origin);
  await page.locator("main").waitFor();
  if (automatic && !localOnly) await connected(page);
  return {
    page, state,
    async finish() {
      assert.deepEqual(state.unexpected, [], "every browser request was served by the isolated fixture");
      assert.deepEqual(state.errors, [], "no unhandled browser errors");
      assert.ok(state.puts.every((payload) => payload.force === false), "never force-overwrite on retry");
      for (const record of [untouched, archived]) {
        assert.deepEqual(state.remote.records.find((item) => item.id === record.id), record,
          "unrelated and archived remote records remain byte-for-byte equivalent JSON");
      }
      await context.close();
    },
  };
}

async function connected(page) {
  await page.waitForFunction(() => driveState.connected && !driveState.connecting);
}
async function openRecord(page, id = original.id) {
  await page.evaluate((recordId) => { location.hash = `#/record/${recordId}`; }, id);
  await page.waitForFunction((recordId) => activeExperiment?.id === recordId && Boolean(document.querySelector("[data-editor]")), id);
}
async function edit(page, text) {
  await page.locator("[data-editor]").evaluate((editor, value) => {
    editor.innerHTML = `<p>${value}</p>`;
    editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
  }, text);
}
async function drafts(page) {
  return page.evaluate(() => NotebookPersistence.getDrafts(db, driveSettings.backendUrl));
}
async function waitForAsync(page, predicate, argument) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (await page.evaluate(predicate, argument)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for asynchronous browser condition: ${predicate.toString()}`);
}
async function waitSaved(page) {
  await waitForAsync(page, async () => (await NotebookPersistence.getDrafts(db, driveSettings.backendUrl)).length === 0 && recordSaveQueues.size === 0);
}
async function waitDraft(page, text) {
  await waitForAsync(page, async (value) => (await NotebookPersistence.getDrafts(db, driveSettings.backendUrl)).some((draft) => draft.record.content === `<p>${value}</p>`), text);
}

(async () => {
  const executablePath = process.env.BROWSER_EXECUTABLE;
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  try {
    {
      const legacy = clone(fixture);
      delete legacy.recordWriteProtocol;
      Object.values(legacy.recordMeta).forEach(meta => { delete meta.revision; });
      const env = await session(browser, { workspace: legacy });
      await openRecord(env.page);
      await edit(env.page, "Preserve this draft until the backend is protected.");
      await waitDraft(env.page, "Preserve this draft until the backend is protected.");
      await env.page.waitForFunction(() => !driveState.connected && Boolean(driveState.error));
      assert.equal(env.state.puts.length, 0, "the new frontend must not send writes to an unprotected backend");
      assert.deepEqual(env.state.remote.records, legacy.records);
      assert.match(await env.page.locator("[data-save-state]").innerText(), /device/);
      await env.finish();
      console.log("PASS an older backend cannot receive unprotected writes; the local draft remains intact");
    }

    {
      const env = await session(browser);
      await openRecord(env.page);
      await env.page.locator("[data-editor]").evaluate((editor) => {
        editor.innerHTML = "<p>Typed immediately before navigation.</p>";
        editor.dispatchEvent(new InputEvent("input", { bubbles: true }));
        location.hash = "#/";
      });
      await waitForAsync(env.page, async () => (await getExperiment("synthetic-edit")).content === "<p>Typed immediately before navigation.</p>");
      await env.page.waitForFunction(() => activeExperiment === null);
      await waitSaved(env.page);
      assert.equal(env.state.remote.records[0].content, "<p>Typed immediately before navigation.</p>");
      assert.equal(env.state.puts.length, 1);
      await env.finish();
      console.log("PASS immediate navigation preserves and uploads the edited record");
    }

    {
      let failFirst = true;
      const retryHeld = deferred();
      const retryStarted = deferred();
      const env = await session(browser, { onPut: async ({ route, payload, accept }) => {
        if (failFirst) { failFirst = false; await route.abort("failed"); return; }
        retryStarted.resolve();
        await retryHeld.promise;
        await route.fulfill({ json: accept(payload) });
      } });
      await openRecord(env.page);
      await edit(env.page, "Draft survives an offline reload.");
      await waitDraft(env.page, "Draft survives an offline reload.");
      await env.page.waitForFunction(() => !driveState.connected && Boolean(driveState.error));
      assert.match(await env.page.locator("[data-save-state]").innerText(), /device|local|waiting|pending/i);
      env.state.offline = true;
      await env.page.reload();
      await env.page.waitForFunction(() => !driveState.connecting && Boolean(driveState.error));
      await waitDraft(env.page, "Draft survives an offline reload.");
      assert.equal(await env.page.locator("[data-editor]").innerHTML(), "<p>Draft survives an offline reload.</p>");
      assert.equal(env.state.remote.records[0].content, original.content);
      env.state.offline = false;
      await env.page.evaluate(() => { connectDrive(savedBackendCredential()).catch(() => {}); });
      await reached(retryStarted, "retry PUT after reconnect");
      await connected(env.page);
      assert.equal(await env.page.locator("[data-editor]").innerHTML(), "<p>Draft survives an offline reload.</p>", "reconnect overlays local pending content over the older remote snapshot");
      assert.equal((await drafts(env.page)).length, 1, "pending data remains until acknowledgement");
      retryHeld.resolve();
      await waitSaved(env.page);
      assert.equal(env.state.remote.records[0].content, "<p>Draft survives an offline reload.</p>");
      await env.finish();
      console.log("PASS network failure, offline reload and reconnect preserve then safely synchronize the draft");
    }

    {
      const env = await session(browser, { onPut: async ({ route, payload, accept }) => {
        if (payload.record.id === original.id) await route.abort("failed");
        else await route.fulfill({ json: accept(payload) });
      } });
      await openRecord(env.page);
      await edit(env.page, "Local work awaiting conflict review.");
      await env.page.waitForFunction(() => !driveState.connected && Boolean(driveState.error));
      env.state.remote.records[0].content = "<p>A colleague's newer work.</p>";
      env.state.remote.recordMeta[original.id].modifiedTime = "colleague-v2";
      env.state.remote.recordMeta[original.id].revision = "colleague-revision-2";
      const putsBefore = env.state.puts.length;
      await env.page.evaluate(() => connectDrive(savedBackendCredential()));
      await connected(env.page);
      const pending = await drafts(env.page);
      assert.equal(pending.length, 1);
      assert.equal(pending[0].needsReview, true);
      assert.equal(pending[0].baseModifiedTime, "base-v1");
      assert.equal(pending[0].record.content, "<p>Local work awaiting conflict review.</p>");
      assert.equal(env.state.remote.records[0].content, "<p>A colleague's newer work.</p>");
      assert.equal(env.state.puts.length, putsBefore, "conflicting local draft is not automatically sent");
      assert.match(await env.page.locator("#app").innerText(), /review|conflict|changed/i);
      await env.page.locator("[data-review-drafts]").click();
      await env.page.locator(`[data-recover-draft="${original.id}"]`).click();
      await env.page.waitForFunction(() => activeExperiment?.title.endsWith("(recovered copy)"));
      await waitSaved(env.page);
      assert.equal(env.state.remote.records[0].content, "<p>A colleague's newer work.</p>", "recovery leaves the original Drive record intact");
      const recovered = env.state.remote.records.find((record) => !fixture.records.some((existing) => existing.id === record.id));
      assert.ok(recovered, "explicit recovery creates a separately identified record");
      assert.equal(recovered.content, "<p>Local work awaiting conflict review.</p>");
      await env.finish();
      console.log("PASS conflict review preserves the remote original and explicitly saves a separate recovered copy");
    }

    {
      const env = await session(browser, { onPut: async ({ route }) => route.fulfill({ status: 409, json: { error: "Synthetic concurrent update" } }) });
      await openRecord(env.page);
      await edit(env.page, "Keep this draft after a 409.");
      await waitForAsync(env.page, async () => (await NotebookPersistence.getDrafts(db, driveSettings.backendUrl)).some((draft) => draft.needsReview));
      assert.equal((await drafts(env.page))[0].record.content, "<p>Keep this draft after a 409.</p>");
      assert.equal(env.state.puts.length, 1);
      assert.equal(env.state.remote.records[0].content, original.content);
      assert.ok(!env.state.dialogs.some((message) => /overwrite/i.test(message)), "background conflict does not present a force-overwrite prompt");
      await env.finish();
      console.log("PASS HTTP 409 retains the draft for review without force-overwrite");
    }

    {
      const firstHeld = deferred();
      const firstStarted = deferred();
      const secondHeld = deferred();
      const secondStarted = deferred();
      const env = await session(browser, { onPut: async ({ route, payload, state, accept }) => {
        if (state.puts.length === 1) { firstStarted.resolve(); await firstHeld.promise; }
        else { secondStarted.resolve(); await secondHeld.promise; }
        await route.fulfill({ json: accept(payload) });
      } });
      await openRecord(env.page);
      await edit(env.page, "First revision in flight.");
      await reached(firstStarted, "first PUT");
      await edit(env.page, "Second revision must remain pending.");
      await waitDraft(env.page, "Second revision must remain pending.");
      firstHeld.resolve();
      await reached(secondStarted, "second PUT");
      assert.equal((await drafts(env.page))[0].record.content, "<p>Second revision must remain pending.</p>");
      assert.equal(await env.page.evaluate(() => getExperiment("synthetic-edit").then((record) => record.content)), "<p>Second revision must remain pending.</p>");
      assert.doesNotMatch(await env.page.locator("[data-save-state]").innerText(), /^Saved(?: to Drive)?$/i, "an older acknowledgement cannot claim the newer draft is saved remotely");
      secondHeld.resolve();
      await waitSaved(env.page);
      assert.equal(env.state.puts.length, 2);
      assert.equal(env.state.remote.records[0].content, "<p>Second revision must remain pending.</p>");
      await env.finish();
      console.log("PASS slow acknowledgement cannot delete or falsely acknowledge a newer local revision");
    }

    {
      const env = await session(browser, { onPut: async ({ route, payload, accept }) => {
        accept(payload); // Server accepted the write, but the browser lost its response.
        await route.abort("failed");
      } });
      await openRecord(env.page);
      await edit(env.page, "Accepted write with a lost response.");
      await env.page.waitForFunction(() => !driveState.connected && Boolean(driveState.error));
      assert.equal((await drafts(env.page)).length, 1);
      await env.page.evaluate(() => connectDrive(savedBackendCredential()));
      await connected(env.page);
      await waitSaved(env.page);
      assert.equal(env.state.puts.length, 1, "identical remote content reconciles a lost acknowledgement without a duplicate PUT");
      assert.equal(env.state.remote.records[0].content, "<p>Accepted write with a lost response.</p>");
      await env.finish();
      console.log("PASS an accepted write with a lost response reconciles without duplication");
    }

    {
      const env = await session(browser);
      await openRecord(env.page);
      await env.page.evaluate(() => {
        window.__originalStageDraft = NotebookPersistence.stageDraft;
        NotebookPersistence.stageDraft = () => Promise.reject(new DOMException("Synthetic storage full", "QuotaExceededError"));
      });
      await edit(env.page, "Unsaved input must stay visible.");
      await env.page.waitForFunction(() => /fail|not saved|storage|could not/i.test(document.querySelector("[data-save-state]")?.textContent || ""));
      assert.equal(await env.page.locator("[data-editor]").innerHTML(), "<p>Unsaved input must stay visible.</p>");
      assert.equal(env.state.puts.length, 0, "local staging failure must not send an unprotected network write");
      assert.equal((await drafts(env.page)).length, 0);
      assert.equal(await env.page.evaluate(() => getExperiment("synthetic-edit").then((record) => record.content)), original.content);
      await env.page.evaluate(() => { location.hash = "#/"; });
      await env.page.waitForFunction(() => location.hash === "#/record/synthetic-edit");
      assert.equal(await env.page.locator("[data-editor]").innerHTML(), "<p>Unsaved input must stay visible.</p>", "navigation cannot discard the only in-memory copy after a local storage failure");
      await env.page.evaluate(() => { NotebookPersistence.stageDraft = window.__originalStageDraft; });
      await env.page.locator("[data-retry-local]").click();
      await waitForAsync(env.page, async () => (await getExperiment("synthetic-edit")).content === "<p>Unsaved input must stay visible.</p>");
      await waitSaved(env.page);
      assert.equal(env.state.remote.records[0].content, "<p>Unsaved input must stay visible.</p>");
      await env.finish();
      console.log("PASS local storage failure is visible, preserves input and permits a later successful save");
    }

    {
      const env = await session(browser, { automatic: false, localOnly: true, seedV1: fixture.records });
      const result = await env.page.evaluate(async () => ({ version: db.version, stores: Array.from(db.objectStoreNames), records: await getAllExperiments() }));
      assert.equal(result.version, 3);
      assert.ok(result.stores.includes("pendingWrites"));
      assert.deepEqual(result.records.sort((a, b) => a.id.localeCompare(b.id)), clone(fixture.records).sort((a, b) => a.id.localeCompare(b.id)), "the migration retains all v1 records, including archived research");
      assert.equal(env.state.puts.length, 0);
      await env.finish();
      console.log("PASS IndexedDB v1 migration keeps every existing local record intact");
    }

    {
      const workspace = clone(fixture);
      workspace.records.push(clone(surgery));
      workspace.recordMeta[surgery.id] = { modifiedTime: "base-v1", revision: "surgery-revision-1" };
      let failFirst = true;
      const retryStarted = deferred();
      const retryHeld = deferred();
      const env = await session(browser, { workspace, onPut: async ({ route, payload, accept }) => {
        if (failFirst) { failFirst = false; await route.abort("failed"); return; }
        retryStarted.resolve();
        await retryHeld.promise;
        await route.fulfill({ json: accept(payload) });
      } });
      await env.page.evaluate(() => { location.hash = "#/surgery/synthetic-surgery"; });
      await env.page.locator("[data-surgery-details-form]").waitFor();
      await env.page.waitForFunction(() => [...document.querySelectorAll(".surgery-photo-image")].length === 2 && [...document.querySelectorAll(".surgery-photo-image")].every((image) => image.naturalWidth > 0));
      assert.equal(new Set(env.state.assets).size, 2, "both existing Drive photo references are read from the synthetic fixture");
      await env.page.locator("#detailSurgeryNotes").fill("Explicitly saved surgical notes survive failure and reload.");
      await env.page.getByRole("button", { name: "Save changes", exact: true }).click();
      await env.page.waitForFunction(() => !driveState.connected && Boolean(driveState.error));
      await waitForAsync(env.page, async () => (await NotebookPersistence.getDrafts(db, driveSettings.backendUrl)).some((draft) => draft.record.surgeryNotes === "Explicitly saved surgical notes survive failure and reload."));
      assert.match(await env.page.locator("[data-surgery-save-state]").innerText(), /device|local|waiting|pending/i);
      const beforeReload = (await drafts(env.page))[0].record;
      assert.deepEqual(beforeReload.surgeryPhotos, surgery.surgeryPhotos);
      assert.deepEqual(beforeReload.terminationPhotos, surgery.terminationPhotos);
      assert.equal(beforeReload.terminationNotes, surgery.terminationNotes);
      assert.deepEqual(env.state.remote.records.find((record) => record.id === surgery.id), surgery, "failed request leaves the original remote surgery intact");
      env.state.offline = true;
      await env.page.reload();
      await env.page.waitForFunction(() => !driveState.connecting && Boolean(driveState.error));
      assert.equal(await env.page.locator("#detailSurgeryNotes").inputValue(), beforeReload.surgeryNotes);
      assert.deepEqual((await drafts(env.page))[0].record, beforeReload, "surgery draft survives reload with photo references and metadata unchanged");
      env.state.offline = false;
      await env.page.evaluate(() => { connectDrive(savedBackendCredential()).catch(() => {}); });
      await reached(retryStarted, "surgery retry after reconnect");
      await connected(env.page);
      assert.deepEqual((await drafts(env.page))[0].record, beforeReload);
      retryHeld.resolve();
      await waitSaved(env.page);
      assert.deepEqual(env.state.remote.records.find((record) => record.id === surgery.id), beforeReload, "recovered surgery is uploaded with all pre-existing photo/reference fields intact");
      await env.finish();
      console.log("PASS explicit surgery save survives failed PUT, offline reload and reconnect with all existing photo references intact");
    }

    {
      const env = await session(browser, { width: 320, onPut: async ({ route }) => route.abort("failed") });
      await openRecord(env.page);
      await edit(env.page, "Pending research must block destructive local import.");
      await env.page.waitForFunction(() => !driveState.connected && Boolean(driveState.error));
      const before = { drafts: await drafts(env.page), records: await env.page.evaluate(() => getAllExperiments()) };
      await env.page.evaluate(async () => {
        window.__importRead = false;
        await importNotebookBackup({ text: async () => { window.__importRead = true; return JSON.stringify({ records: [] }); } });
      });
      assert.equal(await env.page.evaluate(() => window.__importRead), false, "import is refused before processing a replacement file");
      assert.deepEqual(await drafts(env.page), before.drafts);
      assert.deepEqual(await env.page.evaluate(() => getAllExperiments()), before.records);
      assert.equal(await env.page.evaluate(() => importedLocalOnly), false);
      assert.ok(env.state.dialogs.some((message) => /pending drafts/i.test(message)), "import explains why pending work must be recovered first");
      const feedback = env.page.locator("[data-save-feedback]");
      await feedback.waitFor({ state: "visible" });
      assert.match(await feedback.innerText(), /waiting for Drive|stored in this browser/i);
      const box = await feedback.boundingBox();
      assert.ok(box && box.x >= 0 && box.x + box.width <= 321, "save feedback fits a 320px mobile viewport");
      const buttons = feedback.locator("button");
      assert.ok(await buttons.count() > 0, "mobile users have a recovery action");
      for (let index = 0; index < await buttons.count(); index += 1) {
        const button = buttons.nth(index);
        assert.equal(await button.isVisible(), true);
        const bounds = await button.boundingBox();
        assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 321, "mobile save action is fully within the viewport width");
      }
      assert.equal(await env.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, "save feedback does not introduce horizontal page overflow");
      await env.page.screenshot({ path: path.join(screenshotDir, "pending-save-320.png"), fullPage: true });
      await env.finish();
      console.log("PASS pending drafts block backup import and mobile recovery feedback fits at 320px");
    }

    {
      const legacyRecords = clone(fixture.records);
      legacyRecords[0].content = "<p>Unsynchronized work from the previous application version.</p>";
      const env = await session(browser, { seedV1: legacyRecords });
      await openRecord(env.page);
      const pending = await drafts(env.page);
      assert.equal(pending.length, 1, "unchanged legacy cache entries reconcile while the differing record remains protected");
      assert.equal(pending[0].recordId, original.id);
      assert.equal(pending[0].needsReview, true);
      assert.equal(pending[0].record.content, legacyRecords[0].content);
      assert.equal(await env.page.locator("[data-editor]").innerHTML(), legacyRecords[0].content);
      assert.equal(env.state.remote.records[0].content, original.content);
      assert.equal(env.state.puts.length, 0, "legacy work with no known Drive baseline is never uploaded automatically");
      await env.finish();
      console.log("PASS upgrading with divergent v1 cached work preserves it through automatic sign-in");
    }

    {
      const workspaceStarted = deferred();
      const workspaceHeld = deferred();
      const env = await session(browser, { onWorkspace: async ({ route, state, snapshot }) => {
        if (state.reads > 1) { workspaceStarted.resolve(); await workspaceHeld.promise; }
        await route.fulfill({ json: snapshot });
      } });
      await openRecord(env.page);
      // A workspace response represents the remote snapshot when its GET began.
      // A queued editor/visibility callback must not upload and acknowledge a
      // newer draft while that older snapshot is still being applied.
      await env.page.evaluate(() => { window.__workspaceRead = loadDriveWorkspace(); });
      await reached(workspaceStarted, "held workspace read");
      await edit(env.page, "New edit while the older workspace response is in flight.");
      await waitDraft(env.page, "New edit while the older workspace response is in flight.");
      await env.page.evaluate(() => flushPendingWrites());
      assert.equal(env.state.puts.length, 0, "uploads wait until an older workspace snapshot has been merged");
      workspaceHeld.resolve();
      await env.page.evaluate(() => window.__workspaceRead);
      await env.page.evaluate(() => flushPendingWrites());
      await waitSaved(env.page);
      assert.equal(await env.page.evaluate(() => getExperiment("synthetic-edit").then((record) => record.content)), "<p>New edit while the older workspace response is in flight.</p>");
      assert.equal(env.state.remote.records[0].content, "<p>New edit while the older workspace response is in flight.</p>");
      await env.finish();
      console.log("PASS stale workspace reads cannot erase a newer save acknowledged in the background");
    }
    {
      const env = await session(browser, { onPut: async ({ route, payload, state, accept }) => {
        if (payload.baseRevision !== state.remote.recordMeta[payload.record.id].revision) {
          await route.fulfill({ status: 409, json: { error: "Synthetic stale acknowledgement baseline" } });
          return;
        }
        await route.fulfill({ json: accept(payload) });
      } });
      await env.page.evaluate((record) => {
        const acknowledge = NotebookPersistence.acknowledgeDraft;
        let injectTyping = true;
        NotebookPersistence.acknowledgeDraft = async (...args) => {
          const result = await acknowledge(...args);
          if (injectTyping) {
            injectTyping = false;
            // Deliberately hold the caller between its committed IndexedDB
            // acknowledgement and the in-memory revision update.
            await stageRecordSave({ ...record, content: "<p>Typing at the save acknowledgement boundary.</p>" });
          }
          return result;
        };
      }, original);
      await env.page.evaluate((record) => saveExperimentRecord({
        ...record, content: "<p>The first edit was successfully saved.</p>",
      }), original);
      await waitSaved(env.page);
      assert.equal(env.state.puts.length, 2);
      assert.notEqual(env.state.puts[0].baseRevision, env.state.puts[1].baseRevision,
        "the second save uses the confirmed first save as its baseline");
      assert.equal(env.state.remote.records.find((record) => record.id === original.id).content,
        "<p>Typing at the save acknowledgement boundary.</p>");
      assert.deepEqual(await drafts(env.page), [], "normal continued typing must not require a recovered copy");
      await env.finish();
      console.log("PASS typing at the acknowledgement boundary uploads the latest edit without a false conflict or recovered copy");
    }
    for (const backgroundRead of ["connect", "workspace"]) {
      const workspace = clone(fixture);
      workspace.records.push(clone(surgery));
      workspace.recordMeta[surgery.id] = { modifiedTime: "surgery-v1", revision: "surgery-revision-1" };
      const env = await session(browser, { workspace, onPut: async ({ route, payload, state, accept }) => {
        if (payload.baseRevision !== state.remote.recordMeta[payload.record.id].revision) {
          await route.fulfill({ status: 409, json: { error: "Another researcher updated this surgery" } });
          return;
        }
        await route.fulfill({ json: accept(payload) });
      } });
      await env.page.evaluate(() => { location.hash = "#/surgery/synthetic-surgery"; });
      await env.page.locator("[data-surgery-details-form]").waitFor();
      const notes = env.page.locator("#detailSurgeryNotes");
      await notes.fill("Unsaved notes entered on the phone during surgery.");
      await notes.focus();
      const remoteIndex = env.state.remote.records.findIndex((record) => record.id === surgery.id);
      env.state.remote.records[remoteIndex].terminationNotes = "Another researcher added a collection observation.";
      env.state.remote.recordMeta[surgery.id] = { modifiedTime: "surgery-v2", revision: "surgery-revision-2" };
      const changedRemote = clone(env.state.remote.records[remoteIndex]);
      await env.page.evaluate((backgroundRead) => backgroundRead === "connect"
        ? connectDrive(savedBackendCredential(), { background: true })
        : loadDriveWorkspace({ background: true }), backgroundRead);
      assert.equal(await notes.inputValue(), "Unsaved notes entered on the phone during surgery.",
        "background recovery must not rerender or discard unsubmitted surgery form input");
      assert.equal(await notes.evaluate((element) => element === document.activeElement), true,
        "background recovery restores the user's current input focus");
      await env.page.getByRole("button", { name: "Save changes", exact: true }).click();
      await waitForAsync(env.page, async () => (await NotebookPersistence.getDrafts(db, driveSettings.backendUrl))
        .some((draft) => draft.recordId === "synthetic-surgery" && draft.needsReview));
      const pending = (await drafts(env.page)).find((draft) => draft.recordId === surgery.id);
      assert.equal(env.state.puts[0].baseRevision, "surgery-revision-1",
        "the old active form cannot adopt the background snapshot's newer conflicting baseline");
      assert.equal(pending.record.surgeryNotes, "Unsaved notes entered on the phone during surgery.");
      assert.deepEqual(pending.record.surgeryPhotos, surgery.surgeryPhotos);
      assert.deepEqual(pending.record.terminationPhotos, surgery.terminationPhotos);
      assert.deepEqual(env.state.remote.records[remoteIndex], changedRemote,
        "the newly observed remote research remains intact when the old form is submitted");
      await env.finish();
      console.log(`PASS background ${backgroundRead} preserves unsubmitted surgery input and cannot grant it a conflicting remote revision`);
    }
    {
      const workspace = clone(fixture);
      workspace.records.push(clone(surgery));
      workspace.recordMeta[surgery.id] = { modifiedTime: "navigation-v1", revision: "navigation-revision-1" };
      const env = await session(browser, { workspace, onPut: async ({ route }) => {
        await route.fulfill({ status: 409, json: { error: "Remote surgery changed during navigation" } });
      } });
      await openRecord(env.page);
      await env.page.evaluate(() => {
        const read = getExperiment;
        const gate = new Promise((resolve) => { window.__releaseNavigation = resolve; });
        getExperiment = async (id) => {
          const record = await read(id);
          if (id === "synthetic-surgery") {
            window.__navigationRead = true;
            await gate;
          }
          return record;
        };
        window.__navigation = renderSurgeryDetailPage("synthetic-surgery");
        const merge = NotebookPersistence.mergeSnapshot;
        NotebookPersistence.mergeSnapshot = async (...args) => {
          const result = await merge(...args);
          // Navigation already read the old record, but finishes rendering
          // while the asynchronous snapshot application is still in progress.
          window.__releaseNavigation();
          await window.__navigation;
          return result;
        };
      });
      await env.page.waitForFunction(() => window.__navigationRead);
      const remote = env.state.remote.records.find((record) => record.id === surgery.id);
      remote.surgeryNotes = "Another researcher's newly saved surgical observations.";
      env.state.remote.recordMeta[surgery.id] = { modifiedTime: "navigation-v2", revision: "navigation-revision-2" };
      const remoteBefore = clone(remote);
      await env.page.evaluate(() => loadDriveWorkspace({ background: true }));
      assert.equal(await env.page.locator("#detailSurgeryNotes").inputValue(), surgery.surgeryNotes);
      assert.equal(await env.page.evaluate(() => driveState.recordRevisions["synthetic-surgery"]), "navigation-revision-1",
        "navigation that rendered an old cached record retains that record's baseline");
      await env.page.locator("#detailSurgeryNotes").fill("Local notes following navigation.");
      await env.page.getByRole("button", { name: "Save changes", exact: true }).click();
      await waitForAsync(env.page, async () => (await NotebookPersistence.getDrafts(db, driveSettings.backendUrl))
        .some((draft) => draft.recordId === "synthetic-surgery" && draft.needsReview));
      assert.equal(env.state.puts[0].baseRevision, "navigation-revision-1");
      assert.deepEqual(remote, remoteBefore);
      await env.finish();
      console.log("PASS navigation completing during a background snapshot cannot attach a fresh token to stale form content");
    }
    console.log("All save-loss browser tests passed; no live backend or Drive was accessed.");
    console.log(`Screenshots: ${screenshotDir}`);
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
