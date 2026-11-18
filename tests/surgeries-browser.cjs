// Uses synthetic surgery records and intercepted requests only; never contacts Drive.
// PLAYWRIGHT_MODULE and BROWSER_EXECUTABLE can select existing local tooling.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = path.resolve(__dirname, "..");
const origin = "http://127.0.0.1:45884";
const backend = "https://surgery-metadata.invalid";
const timestamp = "2026-11-04T12:00:00Z";
const clone = value => JSON.parse(JSON.stringify(value));
const token = `header.${Buffer.from(JSON.stringify({ sub: "synthetic-surgery-user", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.signature`;
const slideFiles = [
  { name: "slide-image.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jrZkAAAAASUVORK5CYII=", "base64") },
  { name: "slide-report.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n% synthetic slide attachment\n%%EOF") },
  { name: "slide-scan.tiff", mimeType: "image/tiff", buffer: Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00]) },
];

function surgery(id, fields = {}) {
  return { id, recordType: "surgery", title: id, surgeryDate: "2026-01-01", surgeryPhotos: [], terminationPhotos: [], createdAt: timestamp, updatedAt: timestamp, ...fields };
}

function endpointSeeds() {
  const endpoints = [0, 7, 8, 14, 15, 28, 29, null];
  return endpoints.flatMap(days => {
    const suffix = days === null ? "unknown" : String(days).padStart(2, "0");
    const terminationDate = days === null ? "2025-12-31" : new Date(Date.UTC(2026, 0, 1 + days)).toISOString().slice(0, 10);
    return [
      surgery(`active-${suffix}`, { title: `Boundary active ${suffix}`, plannedEndpointDays: days }),
      // Opposing planned endpoints prove collected grouping uses actual elapsed days.
      surgery(`collected-${suffix}`, { title: `Boundary collected ${suffix}`, plannedEndpointDays: 99, terminationDate }),
    ];
  });
}

async function fixture(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block", acceptDownloads: true });
  const initial = [surgery("legacy-surgery", { title: "Legacy surgery" }), ...endpointSeeds()];
  const state = { records: new Map(initial.map(record => [record.id, clone(record)])), revisions: new Map(initial.map(record => [record.id, "r1"])), puts: 0, payloads: [], assets: new Map(), assetRequests: [], errors: [], unexpected: [], alerts: [], assetGate: null, failNextAssetName: "" };
  await context.addInitScript(({ token, origin }) => {
    window.google = { accounts: { id: { initialize() {}, renderButton() {} } } };
    if (location.origin === origin) localStorage.setItem("definitely-not-notion-backend-credential-v1", token);
  }, { token, origin });
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
      if (/^\/records\/[^/]+\/assets$/.test(url.pathname) && request.method() === "POST") {
        const bytes = request.postDataBuffer();
        const name = /filename="([^"]+)"/.exec(bytes.toString("latin1"))?.[1];
        const file = slideFiles.find(item => item.name === name);
        assert.ok(file, `unexpected uploaded attachment ${name}`);
        assert.ok(bytes.includes(file.buffer), "upload must preserve original attachment bytes");
        if (state.assetGate) await state.assetGate;
        if (state.failNextAssetName === name) {
          state.failNextAssetName = "";
          return route.fulfill({ status: 503, json: { error: "Synthetic attachment outage" } });
        }
        const id = `synthetic-asset-${state.assets.size + 1}`;
        state.assets.set(id, file);
        state.assetRequests.push({ id, name, recordId: url.pathname.split("/")[2] });
        return route.fulfill({ json: { id, name: `stored-${name}`, mimeType: file.mimeType } });
      }
      if (url.pathname.startsWith("/assets/") && request.method() === "GET") {
        const file = state.assets.get(decodeURIComponent(url.pathname.slice("/assets/".length)));
        assert.ok(file, "only previously uploaded assets may be downloaded");
        return route.fulfill({ contentType: file.mimeType, body: file.buffer });
      }
      if (url.pathname.startsWith("/records/") && request.method() === "PUT") {
        state.puts += 1;
        const payload = request.postDataJSON(), id = decodeURIComponent(url.pathname.slice("/records/".length));
        state.payloads.push(clone(payload));
        assert.equal(payload.record.id, id);
        assert.equal(payload.writeProtocol, 2);
        assert.equal(payload.force, false);
        if (payload.baseRevision !== (state.revisions.get(id) || "")) return route.fulfill({ status: 409, json: { error: "Synthetic conflicting revision" } });
        const revision = `r${state.puts + 1}`;
        state.records.set(id, clone(payload.record));
        state.revisions.set(id, revision);
        return route.fulfill({ json: { ok: true, modifiedTime: revision, revision } });
      }
    }
    state.unexpected.push(`${request.method()} ${url.origin}${url.pathname}`);
    return route.abort();
  });
  context.on("page", page => {
    page.on("pageerror", error => state.errors.push(error.message));
    page.on("dialog", dialog => { state.alerts.push(dialog.message()); return dialog.accept(); });
  });
  const page = await context.newPage();
  await page.goto(`${origin}/#/surgeries`);
  await page.waitForFunction(() => driveState.connected && !driveState.connecting && canEditNotebook());
  return { context, page, state };
}

async function drained(page) {
  await page.waitForFunction(() => pendingDrafts.length === 0 && recordSaveQueues.size === 0 && localSaveOperations.size === 0);
}

async function openRecord(page, id) {
  await page.evaluate(id => { location.hash = `#/surgery/${id}`; }, id);
  await page.locator("[data-surgery-details-form]").waitFor();
}

async function list(page, view = "active") {
  await page.evaluate(view => { location.hash = view === "collected" ? "#/surgeries/collected" : "#/surgeries"; }, view);
  await page.locator("[data-surgery-search]").waitFor();
}

async function layout(page, screenshots, name, dialogSelector = "") {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `${name}: document must fit viewport`);
  if (dialogSelector) {
    assert.equal(await page.locator(dialogSelector).evaluate(form => form.scrollWidth <= form.clientWidth + 1), true, `${name}: dialog must fit viewport`);
    await page.locator(dialogSelector).evaluate(form => { form.scrollTop = 0; });
  }
  await page.screenshot({ path: path.join(screenshots, `${name}.png`), fullPage: true });
}

function parseCsv(text) {
  const rows = [], row = [];
  let value = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) { row.push(value); value = ""; }
    else if (character === "\n" && !quoted) { row.push(value.replace(/\r$/, "")); rows.push(row.splice(0)); value = ""; }
    else value += character;
  }
  if (value || row.length) { row.push(value.replace(/\r$/, "")); rows.push(row); }
  rows[0][0] = rows[0][0].replace(/^\uFEFF/, "");
  return rows;
}

async function downloadedBytes(page, click) {
  const downloaded = page.waitForEvent("download");
  await click();
  const download = await downloaded;
  const file = await download.path();
  return { name: download.suggestedFilename(), bytes: fs.readFileSync(file) };
}

async function run() {
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  const screenshots = fs.mkdtempSync(path.join(os.tmpdir(), "surgery-metadata-browser-"));
  try {
    const { context, page, state } = await fixture(browser);
    await openRecord(page, "legacy-surgery");
    const details = page.locator("[data-surgery-details-form]");
    assert.equal(await details.locator("[name='dateOfBirth']").inputValue(), "");
    assert.equal(await details.locator("[name='animalSex']").inputValue(), "");
    assert.equal(await details.locator("[name='surgeonName']").inputValue(), "");
    assert.match(await details.locator("[data-animal-age-value]").innerText(), /not|unknown|enter/i);
    assert.equal(await page.locator("[data-histology-input]").count(), 0, "active surgery must not show collected-slide upload");
    const defaults = await page.evaluate(() => normalizeSurgeryRecord({ id: "old", title: "Old", surgeryDate: "2026-01-01" }));
    assert.equal(defaults.inflammationStatus, "");
    assert.equal(defaults.inflammationNotes, "");
    assert.deepEqual(defaults.histologySlides, []);
    const calendarAges = await page.evaluate(() => [
      { dateOfBirth: "2024-02-28", surgeryDate: "2024-03-01" },
      { dateOfBirth: "2026-03-08", surgeryDate: "2026-03-09" },
      { dateOfBirth: "2026-11-01", surgeryDate: "2026-11-02" },
      { dateOfBirth: "2025-12-31", surgeryDate: "2026-01-01" },
      { dateOfBirth: "2024-02-30", surgeryDate: "2024-03-01" },
      { dateOfBirth: "2026-01-02", surgeryDate: "2026-01-01" },
      { dateOfBirth: "", surgeryDate: "2026-01-01" },
    ].map(animalAgeAtSurgery));
    assert.deepEqual(calendarAges, [2, 1, 1, 1, null, null, null], "calendar age must handle leap days, DST, year changes and invalid/missing dates");
    console.log("PASS legacy surgeries retain blank optional metadata and no inferred inflammation assessment");

    await list(page);
    await page.locator("[data-action='new-surgery-manual']").click();
    const form = page.locator("[data-new-surgery-form]");
    await form.locator("[name='title']").fill("Metadata animal <A>");
    await form.locator("[name='surgeryDate']").fill("2024-03-01");
    await form.locator("[name='dateOfBirth']").fill("2024-03-02");
    assert.equal(await form.evaluate(node => node.checkValidity()), false, "birth after surgery must be rejected");
    const putsBeforeInvalid = state.puts;
    await form.locator("[type='submit']").click();
    assert.equal(state.puts, putsBeforeInvalid);
    assert.equal(await form.isVisible(), true);
    await form.locator("[name='dateOfBirth']").fill("2024-02-28");
    assert.match(await form.locator("[data-animal-age-value]").innerText(), /2 days/, "age must include leap day");
    await form.locator("[name='dateOfBirth']").fill("2024-03-01");
    assert.match(await form.locator("[data-animal-age-value]").innerText(), /0 days/, "birth on surgery date is valid");
    await form.locator("[name='dateOfBirth']").fill("2024-02-28");
    await form.locator("[name='surgeryDate']").fill("2024-03-08");
    assert.match(await form.locator("[data-animal-age-value]").innerText(), /9 days/, "changing surgery date must recompute age");
    await form.locator("[name='animalSex']").selectOption("F");
    await form.locator("[name='surgeonName']").fill('Surgeon "Example", A');
    await form.locator("[name='plannedEndpointDays']").fill("14");
    await form.locator("[name='surgeryNotes']").fill("Synthetic metadata entry only.");
    await page.setViewportSize({ width: 390, height: 844 });
    await layout(page, screenshots, "create-mobile", "[data-new-surgery-form]");
    await form.locator("[type='submit']").click();
    await page.waitForURL(/#\/surgery\//);
    await drained(page);
    const id = page.url().split("#/surgery/")[1];
    const stored = state.records.get(id);
    assert.equal(stored.dateOfBirth, "2024-02-28");
    assert.equal(stored.animalSex, "F");
    assert.equal(stored.surgeonName, 'Surgeon "Example", A');
    assert.equal(stored.inflammationStatus, "");
    await page.reload();
    await page.waitForFunction(() => driveState.connected && !driveState.connecting && canEditNotebook());
    await details.waitFor();
    assert.equal(await details.locator("[name='dateOfBirth']").inputValue(), "2024-02-28");
    assert.equal(await details.locator("[name='animalSex']").inputValue(), "F");
    assert.equal(await details.locator("[name='surgeonName']").inputValue(), 'Surgeon "Example", A');
    assert.match(await details.locator("[data-animal-age-value]").innerText(), /9 days/);
    await layout(page, screenshots, "detail-mobile");
    await details.locator("[name='dateOfBirth']").fill("2024-03-01");
    await details.locator("[name='animalSex']").selectOption("M");
    await details.locator("[type='submit']").click();
    await drained(page);
    assert.equal(state.records.get(id).dateOfBirth, "2024-03-01");
    assert.equal(state.records.get(id).animalSex, "M");
    await page.waitForFunction(() => document.querySelector("[data-animal-age-value]")?.textContent.includes("7 days"));
    console.log("PASS date validation, leap-day and same-day age calculations, metadata create/edit/reload and Drive payloads");

    await page.locator("[data-action='terminate-surgery']").click();
    const collection = page.locator("[data-termination-form]");
    assert.equal(await collection.locator("[name='inflammationStatus']").inputValue(), "");
    assert.deepEqual(await collection.locator("[name='inflammationStatus'] option").evaluateAll(options => options.map(option => option.value)), ["", "successful", "partially-successful", "non-successful"]);
    await collection.locator("[name='terminationDate']").fill("2024-03-16");
    await collection.locator("[name='inflammationStatus']").selectOption("partially-successful");
    const inflammationNotes = 'Review "region A", then region B.\nSecond observation.';
    await collection.locator("[name='inflammationNotes']").fill(inflammationNotes);
    await collection.locator("[name='terminationNotes']").fill("Synthetic collection notes.");
    await layout(page, screenshots, "collection-dialog-mobile", "[data-termination-form]");
    await collection.locator("[type='submit']").click();
    await page.waitForURL(/#\/surgeries\/collected$/);
    await drained(page);
    assert.equal(state.records.get(id).inflammationStatus, "partially-successful");
    assert.equal(state.records.get(id).inflammationNotes, inflammationNotes);
    assert.equal(state.records.get(id).dateOfBirth, "2024-03-01");
    await openRecord(page, id);
    assert.match(await page.locator("main").innerText(), /Partially successful/);
    assert.match(await page.locator("main").innerText(), /Review "region A"/);
    await page.locator("[data-action='edit-termination']").click();
    assert.equal(await collection.locator("[name='inflammationNotes']").inputValue(), inflammationNotes);
    await collection.locator("[name='inflammationStatus']").selectOption("non-successful");
    await collection.locator("[type='submit']").click();
    await collection.waitFor({ state: "detached" });
    await drained(page);
    assert.equal(state.records.get(id).inflammationStatus, "non-successful");
    console.log("PASS optional inflammation classification and separate notes survive collection and edits");

    await page.locator("[data-histology-input]").setInputFiles(slideFiles);
    await page.waitForFunction(async id => (await getExperiment(id))?.histologySlides?.length === 3, id);
    await drained(page);
    await page.locator("[data-download-histology]").nth(2).waitFor();
    const slides = state.records.get(id).histologySlides;
    assert.equal(slides.length, 3);
    assert.deepEqual(slides.map(slide => slide.name), slideFiles.map(file => file.name));
    assert.deepEqual(slides.map(slide => slide.mimeType), slideFiles.map(file => file.mimeType));
    assert.ok(slides.every(slide => slide.driveFileId && !slide.dataUrl));
    assert.deepEqual(state.assetRequests.map(request => request.recordId), [id, id, id]);
    await page.reload();
    await page.waitForFunction(() => driveState.connected && !driveState.connecting && canEditNotebook());
    await page.locator("[data-download-histology]").nth(2).waitFor();
    for (let index = 0; index < slideFiles.length; index += 1) {
      const download = await downloadedBytes(page, () => page.locator("[data-download-histology]").nth(index).click());
      assert.equal(download.name, slideFiles[index].name);
      assert.deepEqual(download.bytes, slideFiles[index].buffer);
    }
    const roundTrip = await page.evaluate(id => normalizeBackupRecords(experiments.filter(record => record.id === id))[0], id);
    assert.equal(roundTrip.dateOfBirth, "2024-03-01");
    assert.equal(roundTrip.animalSex, "M");
    assert.equal(roundTrip.inflammationNotes, inflammationNotes);
    assert.deepEqual(roundTrip.histologySlides, slides);
    const localSlideRoundTrip = await page.evaluate(files => normalizeBackupRecords([{
      id: "local-slides", recordType: "surgery", title: "Local slides", surgeryDate: "2026-01-01",
      histologySlides: files.map(file => ({ id: file.name, name: file.name, mimeType: file.mimeType, dataUrl: file.dataUrl })),
    }])[0].histologySlides, slideFiles.map(file => ({ name: file.name, mimeType: file.mimeType, dataUrl: `data:${file.mimeType};base64,${file.buffer.toString("base64")}` })));
    assert.deepEqual(localSlideRoundTrip.map(slide => slide.dataUrl), slideFiles.map(file => `data:${file.mimeType};base64,${file.buffer.toString("base64")}`), "local PDF and TIFF bytes must survive backup normalization");
    const rejectedFiles = await page.evaluate(() => [
      { name: "script.svg", type: "image/svg+xml", size: 20 },
      { name: "empty.pdf", type: "application/pdf", size: 0 },
      { name: "wrong.pdf", type: "text/html", size: 20 },
      { name: "oversized.tiff", type: "image/tiff", size: HISTOLOGY_MAX_FILE_BYTES + 1 },
    ].map(file => { try { validateHistologyFile(file); return false; } catch { return true; } }));
    assert.deepEqual(rejectedFiles, [true, true, true, true], "unsupported, empty, mismatched and oversized slides must be rejected");
    await layout(page, screenshots, "collected-detail-mobile");
    await page.setViewportSize({ width: 1280, height: 900 });
    await layout(page, screenshots, "collected-detail-desktop");
    console.log("PASS PNG/PDF/TIFF uploads preserve bytes and original filenames through reload, download and backup normalization");

    for (const view of ["active", "collected"]) {
      await list(page, view);
      await page.locator("[data-surgery-search]").fill(`Boundary ${view}`);
      await page.locator("[data-surgery-sort]").selectOption("endpoint-range");
      const rowIds = () => page.locator(".surgery-row").evaluateAll(rows => rows.map(row => row.getAttribute("href").split("/").pop()));
      const groupKeys = () => page.locator("[data-endpoint-range]").evaluateAll(groups => groups.map(group => group.dataset.endpointRange));
      const expectedAsc = ["00", "07", "08", "14", "15", "28", "29", "unknown"].map(suffix => `${view}-${suffix}`);
      const expectedDesc = ["29", "28", "15", "14", "08", "07", "00", "unknown"].map(suffix => `${view}-${suffix}`);
      await page.evaluate(view => { surgeryFilters.sortDirection[view] = "asc"; renderSurgeriesPage(view); }, view);
      assert.deepEqual(await rowIds(), expectedAsc);
      assert.deepEqual(await groupKeys(), ["0-7", "8-14", "15-28", ">28", "unknown"]);
      await page.locator("[data-surgery-sort-direction]").click();
      assert.deepEqual(await rowIds(), expectedDesc);
      assert.deepEqual(await groupKeys(), [">28", "15-28", "8-14", "0-7", "unknown"]);
      await page.locator("[data-surgery-sort-direction]").click();
      for (const width of [360, 768, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await layout(page, screenshots, `${view}-range-${width}`);
      }
    }
    console.log("PASS all endpoint range boundaries, planned versus actual durations, missing dates last in both directions and responsive lists");

    await page.locator("[data-surgery-search]").fill('Surgeon "Example", A');
    assert.equal(await page.locator(".surgery-row").count(), 1, "surgeon metadata must be searchable");
    const exported = await downloadedBytes(page, () => page.locator("[data-action='export-surgeries-csv']").click());
    assert.match(exported.name, /\.csv$/i);
    const csv = parseCsv(exported.bytes.toString("utf8"));
    assert.equal(csv.length, 2, "CSV must contain exactly the current filtered record");
    const exportedRow = Object.fromEntries(csv[0].map((header, index) => [header, csv[1][index]]));
    assert.equal(exportedRow.age_at_surgery_days, "7");
    assert.equal(exportedRow.date_of_birth, "2024-03-01");
    assert.equal(exportedRow.animal_sex, "M");
    assert.equal(exportedRow.surgeon_name, 'Surgeon "Example", A');
    assert.equal(exportedRow.inflammation_status, "non-successful");
    assert.equal(exportedRow.inflammation_notes, inflammationNotes);
    assert.equal(exportedRow.endpoint_range, "8-14");
    assert.ok(csv[1].some(value => value.includes("slide-image.png")), "CSV must include histology filenames");
    console.log("PASS filtered CSV export includes numeric age, structured metadata, endpoint range, attachments and quoted multiline notes");

    const readOnly = await context.newPage();
    await readOnly.goto(`${origin}/#/surgeries/collected`);
    await readOnly.locator("[data-surgery-search]").waitFor();
    assert.equal(await readOnly.evaluate(() => canEditNotebook()), false);
    assert.equal(await readOnly.locator("[data-action='new-surgery-manual']").isDisabled(), true);
    assert.equal(await readOnly.locator("[data-surgery-search]").isEnabled(), true);
    assert.equal(await readOnly.locator("[data-surgery-sort]").isEnabled(), true);
    assert.equal(await readOnly.locator("[data-action='export-surgeries-csv']").isEnabled(), true, "CSV export must remain available without the editor lease");
    await readOnly.locator("[data-surgery-search]").fill("Metadata animal");
    const readOnlyCsv = await downloadedBytes(readOnly, () => readOnly.locator("[data-action='export-surgeries-csv']").click());
    assert.equal(parseCsv(readOnlyCsv.bytes.toString("utf8")).length, 2);
    await openRecord(readOnly, id);
    assert.equal(await readOnly.locator("[data-action='upload-histology']").isDisabled(), true);
    assert.equal(await readOnly.locator("[data-download-histology]").first().isEnabled(), true, "existing slide downloads must remain available without the editor lease");
    await readOnly.close();
    console.log("PASS secondary tabs retain surgery search, sorting, CSV export and slide download controls while editing is disabled");

    await openRecord(page, id);
    await details.locator("[name='dateOfBirth']").fill("2024-03-02");
    await details.locator("[name='surgeonName']").fill("Unsaved photo surgeon");
    await page.locator("[data-detail-surgery-gallery]").setInputFiles(slideFiles[0]);
    await page.waitForFunction(async id => (await getExperiment(id))?.surgeryPhotos?.length === 1, id);
    await drained(page);
    assert.equal(state.records.get(id).dateOfBirth, "2024-03-02");
    assert.equal(state.records.get(id).surgeonName, "Unsaved photo surgeon");
    await page.waitForFunction(() => document.querySelector("[data-surgery-details-form] [name='surgeonName']")?.value === "Unsaved photo surgeon" && !surgeryUploadOperations.size);
    console.log("PASS regular surgery photo upload saves the currently entered birth date and surgeon metadata");

    await details.locator("[name='surgeonName']").fill("Unsaved delayed-slide surgeon");
    let releaseUpload;
    state.assetGate = new Promise(resolve => { releaseUpload = resolve; });
    const delayedRequest = page.waitForRequest(request => request.method() === "POST" && request.url().endsWith(`/records/${id}/assets`));
    await page.locator("[data-histology-input]").setInputFiles(slideFiles[1]);
    await delayedRequest;
    assert.equal(await page.evaluate(() => document.querySelector(".surgery-detail-page").inert), true, "the upload's form must not admit competing edits");
    assert.equal(await page.evaluate(() => surgeryUploadOperations.size), 1);
    assert.equal(await page.evaluate(() => { updateConnectionUi(); return document.querySelector(".surgery-detail-page").inert; }), true, "connection status refresh must not unlock a form during upload");
    assert.equal(await page.evaluate(() => window.dispatchEvent(new Event("beforeunload", { cancelable: true }))), false, "an in-flight attachment must guard browser exit");
    await page.evaluate(() => { location.hash = "#/surgery/legacy-surgery"; });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await page.evaluate(() => activeSurgery.id), id, "navigation must wait for the originating upload");
    state.assetGate = null;
    releaseUpload();
    await page.waitForFunction(() => activeSurgery?.id === "legacy-surgery" && !surgeryUploadOperations.size);
    await drained(page);
    assert.equal(state.records.get(id).histologySlides.length, 4);
    assert.equal(state.records.get(id).surgeonName, "Unsaved delayed-slide surgeon");
    assert.equal(Boolean(state.records.get("legacy-surgery").histologySlides?.length), false, "delayed upload must never attach to the destination record");
    assert.equal(state.records.get("legacy-surgery").surgeonName, undefined);
    console.log("PASS delayed slide upload guards navigation and browser exit, preserving metadata on the originating surgery");

    await openRecord(page, id);
    const previousSlideIds = state.records.get(id).histologySlides.map(slide => slide.id);
    state.failNextAssetName = slideFiles[1].name;
    await page.locator("[data-histology-input]").setInputFiles([slideFiles[0], slideFiles[1]]);
    await page.waitForFunction(() => document.querySelector("[data-histology-upload-status]")?.textContent.includes("Upload stopped") && !surgeryUploadOperations.size);
    await drained(page);
    assert.equal(state.records.get(id).histologySlides.length, 5, "the first completed slide must survive failure of the next upload");
    assert.deepEqual(state.records.get(id).histologySlides.slice(0, 4).map(slide => slide.id), previousSlideIds);
    assert.match(await page.locator("[data-histology-upload-status]").innerText(), /1 of 2 slides saved/);
    assert.equal(await page.evaluate(() => document.querySelector(".surgery-detail-page").inert), false);
    await page.locator("[data-histology-input]").setInputFiles(slideFiles[1]);
    await page.waitForFunction(async id => (await getExperiment(id))?.histologySlides?.length === 6 && !surgeryUploadOperations.size, id);
    await drained(page);
    assert.equal(state.records.get(id).histologySlides.length, 6, "retrying only the failed file must retain all previously stored slides");
    assert.deepEqual(state.records.get(id).histologySlides.slice(0, 4).map(slide => slide.id), previousSlideIds);
    assert.deepEqual(state.records.get(id).histologySlides.slice(4).map(slide => slide.name), slideFiles.slice(0, 2).map(file => file.name));
    console.log("PASS partial upload failure preserves completed attachments and allows retry of the failed slide");

    const uploadsBeforeDisconnect = state.assetRequests.length;
    await page.evaluate(() => {
      window.surgeryOriginalRecordSave = saveExperimentRecord;
      let completedSaves = 0;
      saveExperimentRecord = async record => {
        await window.surgeryOriginalRecordSave(record);
        completedSaves += 1;
        if (completedSaves === 1) { driveState.connected = false; updateConnectionUi(); }
      };
    });
    try {
      await page.locator("[data-histology-input]").setInputFiles([slideFiles[0], slideFiles[1]]);
      await page.waitForFunction(() => document.querySelector("[data-histology-upload-status]")?.textContent.includes("Drive disconnected") && !surgeryUploadOperations.size);
      assert.equal(state.assetRequests.length, uploadsBeforeDisconnect + 1, "connection loss must stop the second file before another upload");
      const disconnectedRecord = await page.evaluate(id => getExperiment(id), id);
      assert.equal(disconnectedRecord.histologySlides.length, 7, "only the first completed file may be attached");
      assert.equal(state.records.get(id).histologySlides.length, 7);
      assert.ok(disconnectedRecord.histologySlides.every(slide => slide.driveFileId && !slide.dataUrl), "a Drive batch must never fall back to inline local attachments");
      assert.equal(disconnectedRecord.histologySlides.at(-1).name, slideFiles[0].name);
      assert.match(await page.locator("[data-histology-upload-status]").innerText(), /1 of 2 slides saved/);
    } finally {
      await page.evaluate(() => {
        saveExperimentRecord = window.surgeryOriginalRecordSave;
        delete window.surgeryOriginalRecordSave;
        driveState.connected = true;
        updateConnectionUi();
      });
    }
    await drained(page);
    console.log("PASS connection loss between files stops the batch and preserves the completed Drive reference without inline fallback");

    assert.deepEqual(state.errors, []);
    assert.deepEqual(state.unexpected, []);
    assert.deepEqual(state.alerts, []);
    await context.close();
    console.log(`Screenshots: ${screenshots}`);
  } finally { await browser.close(); }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
