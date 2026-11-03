// Disposable browser profiles and synthetic intercepted requests only.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = path.resolve(__dirname, "..");
const origin = "http://127.0.0.1:45879";
const backend = "https://automatic-sync.invalid";
const token = `header.${Buffer.from(JSON.stringify({ sub: "synthetic", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.signature`;
const original = { id: "synthetic-record", recordType: "notebook", sectionId: "experiments", title: "Synthetic record", content: "<p>Original.</p>", summary: "", labels: [], customFields: {}, status: "in-progress", outcome: "pending", createdAt: "2026-11-03T00:00:00Z", updatedAt: "2026-11-03T00:00:00Z" };
const clone = value => JSON.parse(JSON.stringify(value));
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
async function fixture(browser, onPut) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  const state = { remote: clone(original), revision: "r1", puts: 0, reads: 0, requests: [], errors: [], unexpected: [] };
  await context.addInitScript(token => {
    window.google = { accounts: { id: { initialize() {}, renderButton() {} } } };
    localStorage.setItem("definitely-not-notion-backend-credential-v1", token);
  }, token);
  await context.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === origin) {
      const name = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      if (name === "config.js") return route.fulfill({ contentType: "application/javascript", body: `window.DEFINITELY_NOT_NOTION_CONFIG=${JSON.stringify({googleClientId:"synthetic",backendUrl:backend})}` });
      if (["index.html", "app.js", "persistence.js", "styles.css"].includes(name)) {
        let body = fs.readFileSync(path.join(root, name), "utf8").replace(/<link rel="preconnect"[^>]*>/g, "");
        // Accelerate only the retry schedule; no request timeout or save code changes.
        if (name === "app.js") body = body.replace("[2000, 5000, 10000, 30000, 60000]", "[60, 120, 240, 480, 960]");
        return route.fulfill({ body, contentType: name.endsWith(".js") ? "application/javascript" : name.endsWith(".css") ? "text/css" : "text/html" });
      }
      if (name === "favicon.ico") return route.fulfill({ status: 204 });
    }
    if (url.origin === backend) {
      if (url.pathname === "/health") return route.fulfill({ json: { ok: true } });
      if (url.pathname === "/workspace" && request.method() === "GET") {
        state.reads += 1; state.requests.push("GET");
        return route.fulfill({ json: { recordWriteProtocol: 2, taxonomy: { sections: [{ id:"experiments", name:"Experiment", columns: [] }] }, records: [clone(state.remote)], recordMeta: { [original.id]: { modifiedTime: state.revision, revision: state.revision } } } });
      }
      if (url.pathname === `/records/${original.id}` && request.method() === "PUT") {
        state.puts += 1; state.requests.push("PUT");
        const payload = request.postDataJSON();
        const accept = () => {
          assert.equal(payload.baseRevision, state.revision, "only the last observed/acknowledged version may be replaced");
          assert.equal(payload.force, false);
          state.remote = clone(payload.record); state.revision = `r${state.puts + 1}`;
          return { ok: true, modifiedTime: state.revision, revision: state.revision };
        };
        if (onPut) return onPut({ route, payload, state, accept });
        return route.fulfill({ json: accept() });
      }
    }
    state.unexpected.push(`${request.method()} ${url.origin}${url.pathname}`); return route.abort();
  });
  const page = await context.newPage();
  page.on("pageerror", error => state.errors.push(error.message));
  page.on("dialog", dialog => dialog.type() === "beforeunload" ? dialog.accept() : dialog.dismiss());
  await page.goto(origin);
  await page.waitForFunction(() => driveState.connected && !driveState.connecting);
  return { context, page, state, async finish() { assert.deepEqual(state.errors, []); assert.deepEqual(state.unexpected, []); await context.close(); } };
}
async function drained(page) {
  await page.waitForFunction(() => pendingDrafts.length === 0 && recordSaveQueues.size === 0 && !automaticSync.running);
}
async function save(page, content) { await page.evaluate(({ original, content }) => saveExperimentRecord({ ...original, content }), { original, content }); }

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  try {
    {
      const env = await fixture(browser, ({ route, state, accept }) => state.puts === 1 ? route.abort("connectionfailed") : route.fulfill({ json: accept() }));
      await save(env.page, "<p>Mobile edit survives interrupted connection.</p>");
      await drained(env.page);
      assert.equal(env.state.remote.content, "<p>Mobile edit survives interrupted connection.</p>");
      assert.deepEqual(env.state.requests, ["GET", "PUT", "GET", "PUT"], "re-read before retrying an uncertain save");
      const reads = env.state.reads; await env.page.waitForTimeout(300);
      assert.equal(env.state.reads, reads, "no polling when nothing is pending");
      await env.finish(); console.log("PASS automatic recovery after mobile network interruption");
    }
    {
      const started = deferred(), release = deferred();
      const env = await fixture(browser, async ({ route, state, accept }) => {
        const confirmation = accept();
        if (state.puts === 1) { started.resolve(); await release.promise; return route.abort("connectionfailed"); }
        return route.fulfill({ json: confirmation });
      });
      const saving = save(env.page, "<p>First edit committed but response lost.</p>");
      await started.promise;
      await env.page.evaluate(original => stageRecordSave({ ...original, content: "<p>Newer typing during lost response.</p>" }), original);
      release.resolve(); await saving; await drained(env.page);
      assert.equal(env.state.remote.id, original.id);
      assert.equal(env.state.remote.content, "<p>Newer typing during lost response.</p>");
      assert.equal(env.state.puts, 2);
      assert.deepEqual(env.state.requests, ["GET", "PUT", "GET", "PUT"]);
      await env.finish(); console.log("PASS lost acknowledgement and newer typing save the original record automatically");
    }
    {
      const env = await fixture(browser, ({ route, state }) => {
        state.remote = { ...state.remote, content: "<p>Another researcher's edit.</p>" }; state.revision = "other-r2";
        return route.fulfill({ status: 409, json: { error: "Synthetic conflict" } });
      });
      await save(env.page, "<p>Local conflicting edit.</p>");
      await env.page.waitForFunction(() => automaticSync.timer === null && !automaticSync.running && pendingDrafts[0]?.needsReview);
      await env.page.waitForTimeout(300);
      assert.equal(env.state.puts, 1); assert.equal(env.state.reads, 2);
      assert.equal(env.state.remote.content, "<p>Another researcher's edit.</p>");
      assert.equal(await env.page.evaluate(() => pendingDrafts[0].record.content), "<p>Local conflicting edit.</p>");
      await env.finish(); console.log("PASS genuine conflicts stay preserved without repeated writes or recovered copies");
    }
    for (const mode of ["disconnect", "imported", "read-only", "expired"]) {
      const env = await fixture(browser);
      await env.page.evaluate(({ original, mode }) => {
        if (mode === "disconnect") { rememberBackendCredential(""); resetDriveState(); }
        if (mode === "imported") importedLocalOnly = true;
        if (mode === "read-only") editorLease.ready = false;
        if (mode === "expired") localStorage.setItem(BACKEND_CREDENTIAL_KEY, "expired-token");
        return NotebookPersistence.stageDraft(db, { key: `${driveSettings.backendUrl}\n${original.id}`, backendUrl: driveSettings.backendUrl, recordId: original.id, record: { ...original, content: "Gate test draft" }, revision: "gate-revision", baseModifiedTime: "r1", baseRevision: "r1" }).then(refreshPendingDrafts);
      }, { original, mode });
      await env.page.evaluate(() => { window.dispatchEvent(new Event("online")); document.dispatchEvent(new Event("visibilitychange")); window.dispatchEvent(new Event("pageshow")); });
      await env.page.waitForTimeout(300);
      assert.equal(env.state.puts, 0); assert.equal(env.state.reads, 1);
      assert.equal(await env.page.evaluate(() => pendingDrafts.length), 1);
      await env.finish(); console.log(`PASS automatic sync respects ${mode} gate and preserves drafts`);
    }
    {
      const env = await fixture(browser, ({ route }) => route.fulfill({ status: 403, json: { error: "Synthetic forbidden" } }));
      await save(env.page, "<p>Preserved without authorization.</p>");
      await env.page.evaluate(() => window.dispatchEvent(new Event("online")));
      await env.page.waitForTimeout(300);
      assert.equal(env.state.puts, 1); assert.equal(env.state.reads, 1);
      assert.equal(await env.page.evaluate(() => pendingDrafts.length), 1);
      await env.finish(); console.log("PASS permanent authorization failures do not loop");
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
