// Two separate browser profiles -> two real backend VM instances -> one fake
// Drive storage boundary. All requests are intercepted; no live data is used.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { createServer } = require("../backend/test/helpers/server");
const { createFakeDrive, rendezvous, clone } = require("../backend/test/helpers/fake-drive");

const root = path.resolve(__dirname, "..");
const origin = "http://127.0.0.1:45878";
const backend = "https://concurrent-edit-tests.invalid";
const credentialKey = "definitely-not-notion-backend-credential-v1";
const token = `header.${Buffer.from(JSON.stringify({ sub: "synthetic", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.signature`;
const record = { id: "shared-synthetic", recordType: "notebook", sectionId: "experiments", title: "Shared synthetic experiment", content: "<p>Original synthetic observations.</p>", labels: [], customFields: {}, summary: "", status: "in-progress", outcome: "pending", evidence: [{ driveFileId: "photo-file", label: "Preserve existing attachment" }], createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" };
const archived = { ...record, id: "archived-synthetic", deletedAt: "2026-01-02T00:00:00Z" };
const workspace = { recordsFolderId: "records", assetsFolderId: "assets", configFileId: "config" };

async function until(predicate, description) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error(`Timed out: ${description}`);
}

async function user(browser, drive, name) {
  const instance = createServer({ env: { RECORD_ID_REGISTRY_FILE_ID: "registry" } });
  instance.server.fetch = drive.fetchFor(name);
  instance.server.ensureWorkspace = async () => workspace;
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 390, height: 844 } });
  const state = { unexpected: [], errors: [], puts: [] };
  await context.addInitScript(({ credentialKey, token }) => {
    localStorage.setItem(credentialKey, token);
    window.google = { accounts: { id: { initialize() {}, renderButton() {} } } };
  }, { credentialKey, token });
  await context.route("**/*", async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === origin) {
      const file = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      if (file === "config.js") return route.fulfill({ contentType: "application/javascript", body: `window.DEFINITELY_NOT_NOTION_CONFIG = ${JSON.stringify({ googleClientId: "synthetic-client", backendUrl: backend })};` });
      if (["index.html", "app.js", "persistence.js", "styles.css"].includes(file)) {
        const body = fs.readFileSync(path.join(root, file), "utf8").replace(/<link rel="preconnect"[^>]*>/g, "");
        return route.fulfill({ body, contentType: file.endsWith(".js") ? "application/javascript" : file.endsWith(".css") ? "text/css" : "text/html" });
      }
      if (file === "favicon.ico") return route.fulfill({ status: 204 });
    }
    if (url.origin === backend) {
      if (request.method() === "GET" && url.pathname === "/health") return route.fulfill({ json: { ok: true, recordWriteProtocol: 2 } });
      if (request.method() === "GET" && url.pathname === "/workspace") return route.fulfill({ json: clone(await instance.server.readWorkspace(workspace)) });
      if (request.method() === "PUT" && /^\/records\/[^/]+$/.test(url.pathname)) {
        const payload = request.postDataJSON();
        state.puts.push(payload);
        const result = await new Promise(resolve => {
          const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { resolve({ status: this.statusCode, json: clone(value) }); } };
          instance.routes.get("PUT /records/:id")({ body: payload, params: { id: decodeURIComponent(url.pathname.slice("/records/".length)) } }, response,
            error => resolve({ status: error.status || 500, json: { error: error.message } }));
        });
        return route.fulfill(result);
      }
    }
    state.unexpected.push(`${request.method()} ${url.origin}${url.pathname}`);
    return route.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(15000);
  page.on("pageerror", error => state.errors.push(error.message));
  page.on("dialog", dialog => dialog.type() === "beforeunload" ? dialog.accept() : dialog.dismiss());
  await page.goto(`${origin}/#/record/${record.id}`);
  try {
    await page.waitForFunction(() => driveState.connected && !driveState.connecting);
  } catch (error) {
    error.message += `; synthetic browser state: ${JSON.stringify(await page.evaluate(() => ({ error: driveState.error, status: driveState.status, owned: editorLease.owned, ready: editorLease.ready })))}; errors: ${JSON.stringify(state.errors)}`;
    throw error;
  }
  await page.evaluate(id => { location.hash = `#/record/${id}`; }, record.id);
  await page.locator("[data-editor]").waitFor();
  return { page, context, state, instance };
}

async function edit(page, html) {
  await page.locator("[data-editor]").evaluate((editor, html) => {
    editor.innerHTML = html;
    editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
  }, html);
}

(async () => {
  const drive = createFakeDrive({ records: [{ fileId: "physical-record", record }, { fileId: "physical-archived", record: archived }] });
  drive.addFile("photo-file", "synthetic-photo.bin", "assets", { bytes: "Synthetic existing attachment" }, "application/octet-stream");
  const before = drive.snapshot();
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
  try {
    const a = await user(browser, drive, "server-A");
    const b = await user(browser, drive, "server-B");
    assert.notEqual(a.instance.server, b.instance.server);
    assert.equal(await a.page.evaluate(() => canEditNotebook()), true);
    assert.equal(await b.page.evaluate(() => canEditNotebook()), true, "different browser profiles can independently edit");
    const edits = ["<p>Scientist A's synthetic edit.</p>", "<p>Scientist B's synthetic edit.</p>"];
    drive.hooks.beforeCommit = rendezvous(2, event => event.kind === "update" && event.fileId === "physical-record");
    await Promise.all([edit(a.page, edits[0]), edit(b.page, edits[1])]);
    await until(async () => {
      const pending = await Promise.all([a, b].map(({ page }) => page.evaluate(async () => ({ queues: recordSaveQueues.size, drafts: await NotebookPersistence.getDrafts(db, driveSettings.backendUrl) }))));
      return pending.every(item => !item.queues) && pending.filter(item => item.drafts.some(draft => draft.needsReview)).length === 1 && drive.commits.filter(item => item.fileId === "physical-record").length === 1;
    }, "one committed save and one preserved conflict");
    const drafts = await Promise.all([a, b].map(({ page }) => page.evaluate(() => NotebookPersistence.getDrafts(db, driveSettings.backendUrl))));
    const loserIndex = drafts.findIndex(items => items.length);
    const winnerIndex = 1 - loserIndex;
    const loser = [a, b][loserIndex];
    const winner = [a, b][winnerIndex];
    assert.equal(drafts[loserIndex][0].record.content, edits[loserIndex]);
    assert.equal(drafts[loserIndex][0].needsReview, true);
    assert.equal(drive.files.get("physical-record").data.content, edits[winnerIndex]);
    assert.deepEqual(drive.files.get("physical-record").data.evidence, record.evidence);
    assert.equal(await loser.page.locator("[data-review-drafts]").isVisible(), true);
    assert.match(await loser.page.locator("[data-save-state]").innerText(), /review needed/);
    assert.equal(await winner.page.locator("[data-save-state]").innerText(), "Saved to Drive");
    assert.equal(a.state.puts[0].baseRevision, b.state.puts[0].baseRevision, "both users really started from one revision");
    assert.equal(drive.sessions.size, 2, "both sessions reached the Drive write boundary");
    drive.hooks.beforeCommit = null;
    await loser.page.reload();
    await loser.page.waitForFunction(() => driveState.connected && !driveState.connecting);
    assert.equal(await loser.page.locator("[data-editor]").innerHTML(), edits[loserIndex]);
    assert.equal(drive.commits.filter(item => item.fileId === "physical-record").length, 1, "reconnect cannot silently retry the conflict");
    await loser.page.locator("[data-review-drafts]").click();
    await loser.page.locator("[data-recover-draft]").click();
    await until(() => [...drive.files.values()].some(file => file.data?.title?.endsWith("(recovered copy)")), "recovered separate copy");
    await until(() => loser.page.evaluate(() => recordSaveQueues.size === 0 && !driveState.syncing), "recovery completion");
    const copy = [...drive.files.values()].find(file => file.data?.title?.endsWith("(recovered copy)"));
    assert.equal(copy.data.content, edits[loserIndex]);
    assert.deepEqual(copy.data.evidence, record.evidence);
    assert.equal(drive.files.get("physical-record").data.content, edits[winnerIndex], "recovery must not replace the winning original");
    for (const id of ["physical-archived", "photo-file", "config"]) {
      assert.deepEqual(drive.snapshot().find(file => file.id === id), before.find(file => file.id === id), `${id} must remain exact`);
    }
    for (const user of [a, b]) {
      assert.deepEqual(user.state.errors, []);
      assert.deepEqual(user.state.unexpected, []);
      assert.ok(user.state.puts.every(payload => payload.writeProtocol === 2 && payload.force === false));
      await user.context.close();
    }
    console.log("PASS two independent browsers and backend instances: one save wins, the other survives reload and recovers separately; archived records and attachment bytes stay exact.");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
