// Synthetic antibody records and intercepted requests only; never contacts Drive.
// PLAYWRIGHT_MODULE and BROWSER_EXECUTABLE can select existing local tooling.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = path.resolve(__dirname, "..");
const origin = "http://127.0.0.1:45883";
const backend = "https://antibody-library.invalid";
const clone = value => JSON.parse(JSON.stringify(value));
const token = `header.${Buffer.from(JSON.stringify({ sub: "synthetic-antibody-user", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.signature`;
const timestamp = "2026-11-04T12:00:00Z";

async function fixture(browser, extraRecords = []) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
  const initial = [
    { id: "ordinary-note", recordType: "notebook", sectionId: "experiments", title: "Existing notebook record", content: "<p>Synthetic notebook.</p>", summary: "", labels: [], customFields: {}, status: "planned", outcome: "pending", createdAt: timestamp, updatedAt: timestamp },
    { id: "ordinary-surgery", recordType: "surgery", title: "Existing surgery", surgeryDate: "2026-11-01", surgeryPhotos: [], terminationPhotos: [], createdAt: timestamp, updatedAt: timestamp },
    ...extraRecords,
  ];
  const state = { records: new Map(initial.map(record => [record.id, clone(record)])), revisions: new Map(initial.map(record => [record.id, "r1"])), puts: 0, payloads: [], errors: [], unexpected: [], failWrites: false };
  await context.addInitScript(token => {
    window.google = { accounts: { id: { initialize() {}, renderButton() {} } } };
    if (location.origin === "http://127.0.0.1:45883") localStorage.setItem("definitely-not-notion-backend-credential-v1", token);
    window.copiedAntibodyText = "";
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async text => { window.copiedAntibodyText = text; } } });
  }, token);
  await context.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === origin) {
      const name = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      if (name === "config.js") return route.fulfill({ contentType: "application/javascript", body: `window.DEFINITELY_NOT_NOTION_CONFIG=${JSON.stringify({ googleClientId: "synthetic", backendUrl: backend })}` });
      if (["index.html", "app.js", "persistence.js", "styles.css"].includes(name)) return route.fulfill({ body: fs.readFileSync(path.join(root, name), "utf8").replace(/<link rel="preconnect"[^>]*>/g, ""), contentType: name.endsWith(".js") ? "application/javascript" : name.endsWith(".css") ? "text/css" : "text/html" });
      if (name === "favicon.ico") return route.fulfill({ status: 204 });
    }
    if (url.origin === backend) {
      if (url.pathname === "/health") return route.fulfill({ json: { ok: true } });
      if (url.pathname === "/workspace" && request.method() === "GET") return route.fulfill({ json: {
        recordWriteProtocol: 2,
        taxonomy: { sections: [{ id: "experiments", name: "Experiment", columns: [] }] },
        records: [...state.records.values()].map(clone),
        recordMeta: Object.fromEntries([...state.revisions].map(([id, revision]) => [id, { modifiedTime: revision, revision }])),
      } });
      if (url.pathname.startsWith("/records/") && request.method() === "PUT") {
        state.puts += 1;
        if (state.failWrites) return route.fulfill({ status: 503, json: { error: "Synthetic service interruption" } });
        const payload = request.postDataJSON(), id = decodeURIComponent(url.pathname.slice("/records/".length));
        state.payloads.push(clone(payload));
        assert.equal(payload.record.id, id);
        assert.equal(payload.writeProtocol, 2);
        assert.equal(payload.force, false);
        if (payload.baseRevision !== (state.revisions.get(id) || "")) return route.fulfill({ status: 409, json: { error: "Synthetic conflicting revision" } });
        const revision = `r${state.puts + 1}`;
        state.records.set(id, clone(payload.record)); state.revisions.set(id, revision);
        return route.fulfill({ json: { ok: true, modifiedTime: revision, revision } });
      }
    }
    state.unexpected.push(`${request.method()} ${url.origin}${url.pathname}`);
    return route.abort();
  });
  context.on("page", page => {
    page.on("pageerror", error => state.errors.push(error.message));
    page.on("dialog", dialog => dialog.accept());
  });
  const page = await context.newPage();
  await page.goto(origin);
  await page.waitForFunction(() => driveState.connected && !driveState.connecting && canEditNotebook());
  return { context, page, state };
}

async function library(page) {
  await page.getByRole("link", { name: "IHC/IF", exact: true }).click();
  await page.locator("[data-antibody-search]").waitFor();
}

async function drained(page) {
  await page.waitForFunction(() => pendingDrafts.length === 0 && recordSaveQueues.size === 0 && localSaveOperations.size === 0);
}

async function fillProtocol(editor, values) {
  for (const [name, value] of Object.entries(values)) {
    const field = editor.locator(`[data-protocol-field='${name}']`);
    if (name === "application" || name === "validation") await field.selectOption(value);
    else await field.fill(value);
  }
}

async function captureLayout(page, screenshots, name, { dialog = false } = {}) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `${name}: document should not overflow horizontally`);
  if (dialog) {
    assert.equal(await page.locator("[data-antibody-form]").evaluate(form => form.scrollWidth <= form.clientWidth + 1), true, `${name}: dialog content should fit its width`);
    await page.locator("[data-antibody-form]").evaluate(form => { form.scrollTop = 0; });
  } else {
    assert.equal(await page.locator(".primary-nav-link").evaluateAll(links => links.every(link => {
      const rect = link.getBoundingClientRect();
      return rect.width > 0 && rect.left >= 0 && rect.right <= window.innerWidth;
    })), true, `${name}: all three navigation links must remain visible in the viewport`);
  }
  await page.screenshot({ path: path.join(screenshots, `${name}.png`), fullPage: true });
}

async function run() {
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  const screenshots = fs.mkdtempSync(path.join(os.tmpdir(), "antibody-library-browser-"));
  try {
    const { context, page, state } = await fixture(browser);
    await library(page);
    assert.equal(await page.getByRole("link", { name: "IHC/IF", exact: true }).getAttribute("aria-current"), "page");
    await page.locator("[data-action='new-antibody']").first().click();
    const form = page.locator("[data-antibody-form]");
    await form.locator(".antibody-extra-fields summary").click();
    for (const [name, value] of Object.entries({ title: "Synthetic marker <A>", catalogNumber: "AB-1234", manufacturer: "Example supplier", host: "Rabbit", reactiveSpecies: "Mouse, human", clone: "SYN-1", lot: "LOT-42", storage: "Freezer rack A2", productUrl: "https://example.org/antibodies/AB-1234", notes: "Synthetic reference; never a real protocol." })) {
      await form.locator(`[name='${name}']`).fill(value);
    }
    await fillProtocol(form.locator("[data-antibody-protocol-editor]").first(), {
      application: "IHC", context: "Mouse paraffin sections", concentration: "1:250", retrieval: "Recorded retrieval A", incubation: "Recorded incubation A", validation: "validated", notes: "Synthetic IHC protocol note",
    });
    await form.locator("[data-add-antibody-protocol]").click();
    await fillProtocol(form.locator("[data-antibody-protocol-editor]").nth(1), {
      application: "IF", context: "Human frozen sections", concentration: "2 µg/mL", retrieval: "Recorded retrieval B", incubation: "Recorded incubation B", validation: "testing", notes: "Synthetic IF protocol note",
    });
    await form.locator("[data-add-antibody-protocol]").click();
    await form.locator("[data-antibody-protocol-editor]").nth(2).locator("[data-remove-antibody-protocol]").click();
    assert.equal(await form.locator("[data-antibody-protocol-editor]").count(), 2);
    assert.equal(await form.locator("[data-antibody-protocol-editor]").nth(1).locator("[data-protocol-field='concentration']").inputValue(), "2 µg/mL", "adding/removing a protocol must preserve other unsaved form values");
    await page.setViewportSize({ width: 390, height: 844 });
    await captureLayout(page, screenshots, "new-dialog-mobile", { dialog: true });
    await form.getByRole("button", { name: "Save antibody", exact: true }).click();
    await page.waitForURL(/#\/antibody\//);
    await drained(page);
    const id = page.url().split("#/antibody/")[1];
    const stored = state.records.get(id);
    assert.equal(stored.recordType, "antibody");
    assert.equal(stored.sectionId, "__antibodies__");
    assert.equal(stored.protocols.length, 2);
    assert.deepEqual(stored.protocols.map(protocol => protocol.concentration), ["1:250", "2 µg/mL"]);
    assert.equal(stored.host, "Rabbit");
    assert.equal(stored.catalogNumber, "AB-1234");
    await page.reload();
    await page.waitForFunction(() => driveState.connected && !driveState.connecting);
    assert.match(await page.locator("main").innerText(), /1:250/);
    assert.match(await page.locator("main").innerText(), /2 µg\/mL/);
    await captureLayout(page, screenshots, "detail-mobile");
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.locator("[data-copy-antibody-protocol]").first().click();
    const copied = await page.evaluate(() => window.copiedAntibodyText);
    assert.match(copied, /AB-1234/);
    assert.match(copied, /1:250/);
    assert.match(copied, /Mouse paraffin sections/);
    await page.evaluate(id => {
      experiments = experiments.map(record => record.id === id ? { ...record, protocols: record.protocols.map(protocol => ({ ...protocol, concentration: "1:999" })) } : record);
    }, id);
    await page.locator("[data-copy-antibody-protocol]").first().click();
    assert.match(await page.evaluate(() => window.copiedAntibodyText), /1:250/, "copy must use the visible protocol even after a background cache refresh");
    assert.doesNotMatch(await page.evaluate(() => window.copiedAntibodyText), /1:999/);
    await page.evaluate(() => loadExperiments());
    console.log("PASS create, persist, reload, and copy two application-specific protocols");

    await library(page);
    await page.locator("[data-antibody-search]").fill("ab-1234");
    assert.equal(await page.locator(".antibody-card").count(), 1);
    await page.locator("[data-antibody-application]").selectOption("IF");
    assert.match(await page.locator(".antibody-card").innerText(), /2 µg\/mL/);
    assert.doesNotMatch(await page.locator(".antibody-card").innerText(), /1:250/);
    await page.locator("[data-antibody-validated]").check();
    assert.equal(await page.locator(".antibody-card").count(), 0, "IF testing cannot satisfy a validated IHC protocol filter");
    await page.locator("[data-antibody-application]").selectOption("IHC");
    assert.equal(await page.locator(".antibody-card").count(), 1);
    assert.match(await page.locator(".antibody-card").innerText(), /1:250/);
    assert.doesNotMatch(await page.locator(".antibody-card").innerText(), /2 µg\/mL/);
    await page.locator("[data-antibody-search]").fill("does-not-exist");
    assert.equal(await page.locator(".antibody-card").count(), 0);
    await page.locator("[data-antibody-search]").fill("AB-1234");
    await captureLayout(page, screenshots, "desktop");
    for (const width of [360, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await captureLayout(page, screenshots, `library-${width}`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await captureLayout(page, screenshots, "mobile");
    console.log("PASS catalog lookup and application/validation filters retain only matching protocols on desktop and mobile");

    await page.getByRole("link", { name: "Notebook", exact: true }).click();
    await page.locator(".primary-nav-link[href='#/'][aria-current='page']").waitFor();
    assert.doesNotMatch(await page.locator("main").innerText(), /AB-1234|Synthetic marker/);
    assert.match(await page.locator("main").innerText(), /Existing notebook record/);
    await page.getByRole("link", { name: "Surgeries", exact: true }).click();
    await page.locator(".primary-nav-link[href='#/surgeries'][aria-current='page']").waitFor();
    assert.doesNotMatch(await page.locator("main").innerText(), /AB-1234|Synthetic marker/);
    await page.evaluate(id => { location.hash = `#/record/${id}`; }, id);
    await page.waitForURL(new RegExp(`#/antibody/${id}$`));
    const roundTrip = await page.evaluate(id => normalizeBackupRecords(experiments.filter(record => record.id === id))[0], id);
    assert.equal(roundTrip.recordType, "antibody");
    assert.equal(roundTrip.sectionId, "__antibodies__");
    assert.equal(roundTrip.catalogNumber, stored.catalogNumber);
    assert.deepEqual(roundTrip.protocols, stored.protocols);
    console.log("PASS notebook/surgery separation, legacy record links, and backup normalization");

    await page.locator("[data-action='edit-antibody']").click();
    await page.locator("[data-antibody-form] [name='lot']").fill("LOT-43");
    await page.locator("[data-antibody-form] [data-antibody-protocol-editor]").first().locator("[data-protocol-field='concentration']").fill("1:300");
    await captureLayout(page, screenshots, "edit-dialog-mobile", { dialog: true });
    const putsBeforeFailure = state.puts;
    await page.evaluate(() => {
      window.antibodyOriginalStageDraft = NotebookPersistence.stageDraft;
      NotebookPersistence.stageDraft = async () => { throw new DOMException("Synthetic quota failure", "QuotaExceededError"); };
    });
    await page.locator("[data-antibody-form]").getByRole("button", { name: "Save antibody", exact: true }).click();
    await page.waitForFunction(id => failedLocalWrites.has(id) && !antibodyEditor.saving, id);
    assert.equal(await page.locator("[data-antibody-form] [name='lot']").inputValue(), "LOT-43");
    assert.equal(await page.evaluate(async id => (await getExperiment(id)).lot, id), "LOT-42");
    assert.equal(state.puts, putsBeforeFailure, "a failed local transaction must not upload anything");
    assert.match(await page.locator("[data-antibody-dialog-status]").innerText(), /Could not save/);
    await page.locator("[data-antibody-form]").getByRole("button", { name: "Cancel", exact: true }).click();
    assert.equal(await page.locator("[data-antibody-form]").isVisible(), true, "failed local writes must remain available for retry");
    await page.evaluate(() => { NotebookPersistence.stageDraft = window.antibodyOriginalStageDraft; delete window.antibodyOriginalStageDraft; });
    await page.locator("[data-antibody-form]").getByRole("button", { name: "Save antibody", exact: true }).click();
    await page.locator("[data-antibody-form]").waitFor({ state: "detached" });
    await drained(page);
    assert.equal(state.records.get(id).lot, "LOT-43");
    assert.equal(state.records.get(id).protocols[0].concentration, "1:300");
    await page.locator("[data-action='delete-antibody']").click();
    await drained(page);
    assert.ok(state.records.get(id).deletedAt);
    await library(page);
    assert.equal(await page.locator(".antibody-card").count(), 0);
    await page.locator("[data-antibody-show-deleted]").check();
    assert.equal(await page.locator(".antibody-card").count(), 1);
    await page.evaluate(id => { location.hash = `#/antibody/${id}`; }, id);
    await page.locator("[data-action='restore-antibody']").click();
    await drained(page);
    assert.equal(Boolean(state.records.get(id).deletedAt), false);
    console.log("PASS local save failure retains the form for retry; edit, soft delete, and restore preserve both protocols");

    await page.evaluate(async id => {
      const record = await getExperiment(id);
      await saveExperimentRecord({ ...record, productUrl: "javascript:window.antibodyUrlExecuted=true", notes: "<img src=x onerror='window.antibodyNoteExecuted=true'>" });
      await route();
    }, id);
    await drained(page);
    assert.equal(await page.locator("a[href^='javascript:']").count(), 0);
    assert.equal(await page.evaluate(() => Boolean(window.antibodyUrlExecuted || window.antibodyNoteExecuted)), false);
    assert.match(await page.locator("main").innerText(), /<img src=x/);

    await library(page);
    const readOnly = await context.newPage();
    await readOnly.goto(`${origin}/#/ihc-if`);
    await readOnly.locator("[data-antibody-search]").waitFor();
    assert.equal(await readOnly.evaluate(() => canEditNotebook()), false);
    assert.equal(await readOnly.locator("[data-antibody-search]").isEnabled(), true);
    assert.equal(await readOnly.locator("[data-antibody-application]").isEnabled(), true);
    assert.equal(await readOnly.locator("[data-antibody-validated]").isEnabled(), true);
    assert.equal(await readOnly.locator("[data-action='new-antibody']").first().isDisabled(), true);
    await readOnly.locator("[data-antibody-search]").fill("AB-1234");
    assert.equal(await readOnly.locator(".antibody-card").count(), 1);
    assert.equal(await readOnly.locator("[data-copy-antibody-protocol]").first().isEnabled(), true);
    await readOnly.evaluate(() => { navigator.clipboard.writeText = async () => { throw new Error("Synthetic clipboard denial"); }; });
    await readOnly.locator("[data-copy-antibody-protocol]").first().click();
    const fallback = readOnly.locator("[data-antibody-copy-text]");
    assert.match(await fallback.inputValue(), /AB-1234/);
    assert.match(await fallback.inputValue(), /1:300/);
    assert.equal(await fallback.evaluate(field => field.readOnly), true);
    assert.equal(await readOnly.evaluate(() => app.inert), true);
    await fallback.focus();
    await readOnly.keyboard.press("Shift+Tab");
    assert.equal(await readOnly.getByRole("button", { name: "Close", exact: true }).evaluate(button => document.activeElement === button), true);
    await readOnly.keyboard.press("Tab");
    assert.equal(await fallback.evaluate(field => document.activeElement === field), true);
    await readOnly.keyboard.press("Tab");
    assert.equal(await readOnly.getByRole("button", { name: "Close", exact: true }).evaluate(button => document.activeElement === button), true);
    await readOnly.keyboard.press("Tab");
    assert.equal(await fallback.evaluate(field => document.activeElement === field), true);
    await readOnly.getByRole("button", { name: "Close", exact: true }).click();
    await fallback.waitFor({ state: "detached" });
    assert.equal(await readOnly.evaluate(() => app.inert), false);
    await readOnly.close();
    console.log("PASS safe URL/text rendering and read-only lookup/copy access");

    await page.evaluate(id => { location.hash = `#/antibody/${id}`; }, id);
    await page.locator("[data-action='edit-antibody']").click();
    state.failWrites = true;
    await page.locator("[data-antibody-form] [name='productUrl']").fill("https://example.org/antibodies/AB-1234");
    await page.locator("[data-antibody-form] [name='notes']").fill("Preserved during a synthetic service outage");
    await page.locator("[data-antibody-form]").getByRole("button", { name: "Save antibody", exact: true }).click();
    await page.waitForFunction(id => pendingDrafts.some(draft => draft.recordId === id && draft.record.notes.includes("synthetic service outage")), id);
    assert.notEqual(state.records.get(id).notes, "Preserved during a synthetic service outage");
    assert.equal(await page.evaluate(async id => (await getExperiment(id)).notes, id), "Preserved during a synthetic service outage");
    assert.match(await page.locator("[data-save-feedback]").innerText(), /stored|waiting|preserved|device/i);
    assert.deepEqual(state.errors, []);
    assert.deepEqual(state.unexpected, []);
    await context.close();
    console.log("PASS failed network upload retains the complete local antibody draft");

    const conflict = await fixture(browser, [stored]);
    await conflict.page.evaluate(id => { location.hash = `#/antibody/${id}`; }, id);
    await conflict.page.locator("[data-action='edit-antibody']").click();
    await conflict.page.locator("[data-antibody-form] [name='notes']").fill("Local unsaved antibody notes");
    conflict.state.records.set(id, { ...clone(stored), notes: "Another user's changed antibody notes" });
    conflict.state.revisions.set(id, "external-r2");
    await conflict.page.evaluate(async ({ records, recordMeta }) => {
      await applyWorkspaceSnapshot({ records, recordMeta, recordWriteProtocol: 2 }, { preserveEditor: false });
    }, {
      records: [...conflict.state.records.values()].map(clone),
      recordMeta: Object.fromEntries([...conflict.state.revisions].map(([id, revision]) => [id, { modifiedTime: revision, revision }])),
    });
    assert.equal(await conflict.page.evaluate(id => driveState.recordRevisions[id], id), "r1", "an open antibody dialog must retain its original baseline even for a foreground sync");
    assert.equal(await conflict.page.locator("[data-antibody-form] [name='notes']").inputValue(), "Local unsaved antibody notes");
    await conflict.page.locator("[data-antibody-form]").getByRole("button", { name: "Save antibody", exact: true }).click();
    await conflict.page.waitForFunction(id => pendingDrafts.some(draft => draft.recordId === id && draft.needsReview), id);
    assert.equal(conflict.state.payloads[0].baseRevision, "r1");
    assert.equal(conflict.state.records.get(id).notes, "Another user's changed antibody notes");
    assert.equal(await conflict.page.evaluate(id => pendingDrafts.find(draft => draft.recordId === id).record.notes, id), "Local unsaved antibody notes");
    await conflict.page.locator("[data-review-drafts]").click();
    await conflict.page.locator(`[data-recover-draft='${id}']`).click();
    await conflict.page.waitForFunction(id => location.hash.startsWith("#/antibody/") && location.hash !== `#/antibody/${id}`, id);
    await drained(conflict.page);
    const recoveredId = conflict.page.url().split("#/antibody/")[1];
    assert.equal(conflict.state.records.get(recoveredId).recordType, "antibody");
    assert.equal(conflict.state.records.get(recoveredId).notes, "Local unsaved antibody notes");
    assert.deepEqual(conflict.state.records.get(recoveredId).protocols, stored.protocols);
    assert.equal(conflict.state.records.get(id).notes, "Another user's changed antibody notes");
    assert.deepEqual(conflict.state.errors, []);
    assert.deepEqual(conflict.state.unexpected, []);
    await conflict.context.close();
    console.log("PASS foreground snapshot preserves open-dialog baseline and conflicting antibody recovers separately");
    console.log(`Screenshots: ${screenshots}`);
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
