// Same-browser tab ownership tests. Every request is intercepted and uses
// synthetic records; no production backend, Drive account, or credentials.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const root = path.resolve(__dirname, "..");
const origin = "http://127.0.0.1:45876";
const backend = "https://tab-tests.invalid";
const original = { id: "synthetic-shared-record", recordType: "notebook", sectionId: "experiments", title: "Shared synthetic record", content: "<p>Original synthetic research.</p>", summary: "", labels: [], customFields: {}, status: "in-progress", outcome: "pending", createdAt: "2026-08-01T00:00:00Z", updatedAt: "2026-08-01T00:00:00Z" };
const archived = { ...original, id: "synthetic-archived", title: "Archived synthetic record", deletedAt: "2026-08-02T00:00:00Z" };
const taxonomy = { statuses: [], outcomes: [], labels: [], sections: [{ id: "experiments", name: "Experiment", columns: [] }] };
const metadata = { [original.id]: { modifiedTime: "synthetic-base-v1" }, [archived.id]: { modifiedTime: "synthetic-archived-v1" } };
const snapshot = { taxonomy, records: [original, archived], recordMeta: metadata };
const token = `header.${Buffer.from(JSON.stringify({ sub: "synthetic-user", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.signature`;
const clone = value => JSON.parse(JSON.stringify(value));

async function fixture(browser, { noLocks = false, pending = [], automatic = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 320, height: 844 }, serviceWorkers: "block" });
  const state = { unexpected: [], errors: [], backendRequests: [] };
  await context.addInitScript(({ noLocks, automatic, token }) => {
    window.google = { accounts: { id: { initialize() {}, renderButton() {} } } };
    if (noLocks) Object.defineProperty(navigator, "locks", { value: undefined });
    try { if (automatic) localStorage.setItem("definitely-not-notion-backend-credential-v1", token); } catch { /* about:blank has no origin storage */ }
  }, { noLocks, automatic, token });
  context.on("page", page => {
    page.on("pageerror", error => state.errors.push(error.message));
    page.on("dialog", dialog => dialog.type() === "beforeunload" ? dialog.accept() : dialog.dismiss());
  });
  await context.route("**/*", async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === origin) {
      const name = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      if (name === "blank.html") return route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Isolated setup</title>" });
      if (name === "config.js") return route.fulfill({ contentType: "application/javascript", body: `window.DEFINITELY_NOT_NOTION_CONFIG = ${JSON.stringify({ googleClientId: "synthetic-client", backendUrl: backend })};` });
      if (["index.html", "app.js", "persistence.js", "styles.css"].includes(name)) {
        const body = fs.readFileSync(path.join(root, name), "utf8").replace(/<link rel="preconnect"[^>]*>/g, "");
        return route.fulfill({ body, contentType: name.endsWith(".js") ? "application/javascript" : name.endsWith(".css") ? "text/css" : "text/html" });
      }
      if (name === "favicon.ico") return route.fulfill({ status: 204 });
    }
    if (url.origin === backend) {
      state.backendRequests.push({ method: request.method(), path: url.pathname });
      if (request.method() === "GET" && url.pathname === "/health") return route.fulfill({ json: { ok: true } });
      // This suite keeps editing offline. A hidden auto-connect or write is a failure.
    }
    state.unexpected.push(`${request.method()} ${url.origin}${url.pathname}`);
    return route.abort();
  });
  const setup = await context.newPage();
  await setup.goto(`${origin}/blank.html`);
  await setup.evaluate(({ records, pending, backend, metadata, taxonomy }) => new Promise((resolve, reject) => {
    localStorage.setItem("labbook-taxonomy-v1", JSON.stringify(taxonomy));
    const request = indexedDB.open("labbook-db", 2);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("experiments", { keyPath: "id" });
      request.result.createObjectStore("pendingWrites", { keyPath: "key" });
      request.result.createObjectStore("workspaceMeta", { keyPath: "backendUrl" });
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(["experiments", "pendingWrites", "workspaceMeta"], "readwrite");
      records.forEach(record => transaction.objectStore("experiments").put(record));
      pending.forEach(draft => transaction.objectStore("pendingWrites").put(draft));
      transaction.objectStore("workspaceMeta").put({ backendUrl: backend, recordMeta: metadata });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onabort = () => reject(transaction.error);
    };
  }), { records: [original, archived], pending, backend, metadata, taxonomy });
  await setup.close();
  return {
    context, state,
    async page() {
      const page = await context.newPage();
      await page.goto(origin);
      await page.locator("main").waitFor();
      return page;
    },
    async finish() {
      assert.deepEqual(state.unexpected, [], "unexpected network requests are forbidden");
      assert.deepEqual(state.errors, [], "no unhandled browser errors");
      assert.ok(state.backendRequests.every(request => request.method === "GET" && request.path === "/health"), "no workspace reads or writes occur during isolated offline checks");
      await context.close();
    },
  };
}

async function openRecord(page, id = original.id) {
  await page.evaluate(id => { location.hash = `#/record/${id}`; }, id);
  await page.waitForFunction(id => activeExperiment?.id === id && Boolean(document.querySelector("[data-editor]")), id);
}
async function localState(page) {
  return page.evaluate(async () => ({
    records: await getAllExperiments(),
    drafts: await NotebookPersistence.getDrafts(db, driveSettings.backendUrl),
    metadata: await NotebookPersistence.getWorkspaceMeta(db, driveSettings.backendUrl),
    taxonomy: localStorage.getItem("labbook-taxonomy-v1"),
    credential: localStorage.getItem("definitely-not-notion-backend-credential-v1"),
  }));
}
async function edit(page, value) {
  await page.locator("[data-editor]").evaluate((editor, value) => {
    editor.innerHTML = `<p>${value}</p>`;
    editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
  }, value);
  await page.evaluate(() => waitForLocalSaves());
}

(async () => {
  const executablePath = process.env.BROWSER_EXECUTABLE;
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  try {
    {
      const env = await fixture(browser);
      const pages = await Promise.all([env.page(), env.page()]);
      const ownership = await Promise.all(pages.map(page => page.evaluate(() => canEditNotebook())));
      assert.equal(ownership.filter(Boolean).length, 1, "only one tab can acquire the database-wide editor lease");
      const owner = pages[ownership.indexOf(true)];
      const other = pages[ownership.indexOf(false)];
      await owner.evaluate(token => rememberBackendCredential(token), token);
      await other.reload();
      await other.locator("main").waitFor();
      assert.equal(await other.evaluate(() => driveState.connected || driveState.connecting), false, "read-only tab must not auto-connect with the owner's saved credential");
      await Promise.all([openRecord(owner), openRecord(other)]);
      assert.equal(await owner.locator("[data-editor]").getAttribute("contenteditable"), "true");
      assert.equal(await other.locator("[data-editor]").getAttribute("contenteditable"), "false");
      assert.equal(await other.locator("[data-field='title']").isDisabled(), true);
      assert.equal(await other.locator("[data-action='delete-current']").isDisabled(), true);
      assert.equal(await other.locator("[data-editor-lease-feedback]").isVisible(), true);
      assert.equal(await other.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "read-only controls fit a narrow phone screen");
      assert.equal(await other.locator("main").evaluate(element => element.inert), false, "cached navigation remains available");
      await edit(owner, "Owner's offline draft must survive another tab.");
      await owner.evaluate(async id => {
        const draft = (await NotebookPersistence.getDrafts(db, driveSettings.backendUrl)).find(item => item.recordId === id);
        await NotebookPersistence.acknowledgeDraft(db, { key: draft.key, revision: draft.revision, modifiedTime: "synthetic-base-v2" });
        driveState.recordModifiedTimes[id] = "synthetic-base-v2";
      }, original.id);
      await edit(owner, "Owner's offline draft after an acknowledged earlier save.");
      const before = await localState(other);
      assert.equal(before.drafts.length, 1);
      assert.match(before.drafts[0].record.content, /Owner's offline draft/);
      const results = await other.evaluate(async ({ original, snapshot, token }) => {
        const attempts = {
          stage: () => stageRecordSave({ ...original, content: "stale tab" }),
          save: () => saveExperimentRecord(original),
          put: () => putExperiment(original),
          replace: () => replaceAllExperiments([]),
          taxonomy: () => saveTaxonomy(),
          settings: () => saveDriveSettings({ clientId: "other", backendUrl: "https://other.invalid" }),
          config: () => driveSaveConfig(),
          record: () => driveSaveRecord(original, "old-version"),
          asset: () => driveUploadAsset(original.id, new File(["synthetic"], "synthetic.txt")),
          import: () => importNotebookBackup(null),
          snapshot: () => applyWorkspaceSnapshot(snapshot),
          connect: () => connectDrive(token),
          workspace: () => loadDriveWorkspace(),
          directWrite: () => backendFetch(`/records/${original.id}`, { method: "PUT", body: "{}" }),
          recovery: () => openDraftReview(),
          surgeryDelete: () => markExperimentDeleted({ ...original, recordType: "surgery" }),
          restore: () => restoreExperimentRecord({ ...original, deletedAt: "yesterday" }),
        };
        const results = {};
        for (const [name, attempt] of Object.entries(attempts)) {
          try { await attempt(); results[name] = "unexpected-success"; }
          catch (error) { results[name] = error.readOnlyTab === true ? "blocked" : error.message; }
        }
        await flushPendingWrites();
        await flushRecordDraft(original.id);
        await syncDriveNow();
        await seedIfEmpty();
        rememberBackendCredential("must-not-replace-owner-credential");
        return results;
      }, { original, snapshot, token });
      assert.ok(Object.values(results).every(result => result === "blocked"), JSON.stringify(results));
      assert.deepEqual(await localState(other), before, "blocked mutation paths preserve all records, drafts, metadata and settings");
      await other.locator("[data-action='backup']").click();
      assert.equal(await other.locator("[data-action='choose-import']").isDisabled(), true);
      assert.equal(await other.locator("[data-action='export-backup']").isDisabled(), false);
      await other.locator("[data-dialog-close]").click();
      await other.locator("[data-enable-editing]").click();
      assert.equal(await other.evaluate(() => canEditNotebook()), false, "retry cannot steal the live owner's lease");
      await owner.evaluate(() => rememberBackendCredential(""));
      await owner.close();
      await other.locator("[data-enable-editing]").click();
      await other.waitForFunction(() => canEditNotebook() && !editorLease.busy);
      assert.match(await other.locator("[data-editor]").innerHTML(), /Owner's offline draft/, "handoff replaces stale form with current durable draft");
      assert.equal(await other.locator("[data-field='title']").isDisabled(), false);
      assert.equal(await other.locator("[data-editor]").getAttribute("contenteditable"), "true");
      await edit(other, "New owner continues the preserved offline draft.");
      const after = await localState(other);
      assert.equal(after.drafts.length, 1);
      assert.equal(after.drafts[0].baseModifiedTime, "synthetic-base-v2", "handoff reloads the advanced acknowledged version before editing");
      assert.match(after.drafts[0].record.content, /New owner continues/);
      assert.deepEqual(after.records.find(record => record.id === archived.id), archived);
      await env.finish();
      console.log("PASS simultaneous tabs, central write guards, offline draft preservation and safe ownership handoff");
    }
    {
      const pending = { key: `${backend}\n${original.id}`, backendUrl: backend, recordId: original.id, record: { ...original, content: "<p>Existing v2 pending work.</p>" }, revision: "existing-v2-revision", baseModifiedTime: "synthetic-base-v1", needsReview: true, reason: "Synthetic preserved conflict" };
      const env = await fixture(browser, { pending: [pending] });
      const owner = await env.page();
      const other = await env.page();
      assert.equal(await owner.evaluate(() => db.version), 3);
      assert.equal(await other.evaluate(() => db.version), 3);
      assert.deepEqual((await localState(other)).drafts, [pending], "v2 migration must not change or delete pending drafts");
      await env.finish();
      console.log("PASS database v2 upgrade preserves existing pending revision and review metadata exactly");
    }
    {
      const env = await fixture(browser, { noLocks: true, automatic: true });
      const page = await env.page();
      await openRecord(page);
      assert.equal(await page.evaluate(() => canEditNotebook()), false);
      assert.match(await page.locator("[data-editor-lease-feedback]").innerText(), /Web Locks/);
      assert.equal(await page.locator("[data-editor]").getAttribute("contenteditable"), "false");
      assert.deepEqual(env.state.backendRequests, [], "unsupported browsers cannot auto-connect or mutate the shared cache");
      assert.deepEqual((await localState(page)).records, [archived, original]);
      await env.finish();
      console.log("PASS browsers without Web Locks remain read-only even with a saved login");
    }
    console.log("All tab concurrency browser tests passed; no live service was accessed.");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
