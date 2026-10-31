// Real IndexedDB tests in an isolated browser. Every request is intercepted;
// these fixtures never contact Drive, the deployed backend, or existing data.
// NODE_PATH must include Playwright, or set PLAYWRIGHT_MODULE to its module path.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test, before, after } = require("node:test");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const persistence = require("../persistence.js");

let browser;
const source = fs.readFileSync(path.resolve(__dirname, "../persistence.js"), "utf8");
const edge = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
before(async () => {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_EXECUTABLE
      ? { executablePath: process.env.BROWSER_EXECUTABLE }
      : process.platform === "win32" && fs.existsSync(edge) ? { executablePath: edge } : {}),
  });
});
after(async () => { if (browser) await browser.close(); });

async function inDatabase(callback) {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const unexpected = [];
  await context.route("**/*", async (route) => {
    if (route.request().url() === "http://persistence.test.invalid/") {
      await route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Isolated persistence test</title>" });
    } else {
      unexpected.push(route.request().url());
      await route.abort();
    }
  });
  try {
    const page = await context.newPage();
    await page.goto("http://persistence.test.invalid/");
    await page.addScriptTag({ content: source });
    await page.evaluate(async () => {
      window.api = NotebookPersistence;
      window.backend = "https://research.test.invalid";
      window.record = (id = "a", title = "Original") => ({
        id, title, content: "<p>Important experiment & image</p>",
        images: [{ url: "data:image/png;base64,fixture", name: "Observation" }],
        customFields: { concentration: 2, unit: "mM" },
      });
      window.draft = (value, revision = "r1", baseModifiedTime = "t0", backendUrl = backend) => ({
        key: `${backendUrl}\n${value.id}`, backendUrl, recordId: value.id,
        record: value, revision, baseModifiedTime,
      });
      window.db = await new Promise((resolve, reject) => {
        const request = indexedDB.open("isolated-persistence", 2);
        request.onupgradeneeded = () => {
          request.result.createObjectStore("experiments", { keyPath: "id" });
          request.result.createObjectStore("pendingWrites", { keyPath: "key" });
          request.result.createObjectStore("workspaceMeta", { keyPath: "backendUrl" });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      window.seed = ({ records = [], drafts = [], metadata = [] }) => new Promise((resolve, reject) => {
        const tx = db.transaction(["experiments", "pendingWrites", "workspaceMeta"], "readwrite");
        records.forEach((value) => tx.objectStore("experiments").put(value));
        drafts.forEach((value) => tx.objectStore("pendingWrites").put(value));
        metadata.forEach((value) => tx.objectStore("workspaceMeta").put(value));
        tx.oncomplete = resolve;
        tx.onabort = () => reject(tx.error);
      });
      window.dump = () => new Promise((resolve, reject) => {
        const tx = db.transaction(["experiments", "pendingWrites", "workspaceMeta"]);
        const result = {};
        for (const name of ["experiments", "pendingWrites", "workspaceMeta"]) {
          const request = tx.objectStore(name).getAll();
          request.onsuccess = () => { result[name] = request.result; };
        }
        tx.oncomplete = () => resolve(result);
        tx.onabort = () => reject(tx.error);
      });
    });
    const result = await page.evaluate(callback);
    assert.deepEqual(unexpected, [], "No requests should reach a real service");
    return result;
  } finally {
    await context.close();
  }
}

test("JSON equality ignores object order and preserves array order", () => {
  assert.equal(persistence.recordsEqual({ id: "a", nested: { x: 1, y: 2 } }, { nested: { y: 2, x: 1 }, id: "a" }), true);
  assert.equal(persistence.recordsEqual({ items: [1, 2] }, { items: [2, 1] }), false);
  assert.equal(persistence.recordsEqual({ items: [1, 2] }, { items: { 0: 1, 1: 2 } }), false);
});

test("stage commits record and durable draft together, capturing the submitted payload", async () => {
  const result = await inDatabase(async () => {
    const value = draft(record("a", "Unsynced edit"));
    const operation = api.stageDraft(db, value);
    value.record.title = "Changed after submission";
    const stored = await operation;
    return { stored, state: await dump() };
  });
  assert.equal(result.stored.record.title, "Unsynced edit");
  assert.deepEqual(result.state.experiments, [result.stored.record]);
  assert.deepEqual(result.state.pendingWrites, [result.stored]);
});

test("stage preserves an existing draft's baseline and conflict review", async () => {
  const result = await inDatabase(async () => {
    const initial = { ...draft(record()), needsReview: true, reason: "Concurrent edit" };
    await api.stageDraft(db, initial);
    return api.stageDraft(db, draft(record("a", "Typed more"), "r2", "unsafe-new-baseline"));
  });
  assert.equal(result.baseModifiedTime, "t0");
  assert.equal(result.revision, "r2");
  assert.equal(result.needsReview, true);
  assert.equal(result.reason, "Concurrent edit");
});

test("stage uses persisted metadata after reload and flags an unknown existing record", async () => {
  const result = await inDatabase(async () => {
    await seed({ records: [record("a"), record("b")], metadata: [{ backendUrl: backend, recordMeta: { a: { modifiedTime: "observed" } } }] });
    const known = draft(record("a", "Known changed"));
    const unknown = draft(record("b", "Unknown changed"));
    const fresh = draft(record("c", "New"));
    delete known.baseModifiedTime;
    delete unknown.baseModifiedTime;
    delete fresh.baseModifiedTime;
    return { known: await api.stageDraft(db, known), unknown: await api.stageDraft(db, unknown), fresh: await api.stageDraft(db, fresh) };
  });
  assert.equal(result.known.baseModifiedTime, "observed");
  assert.equal(Boolean(result.known.needsReview), false);
  assert.equal(result.unknown.baseModifiedTime, "");
  assert.equal(result.unknown.needsReview, true);
  assert.equal(result.fresh.baseModifiedTime, "");
  assert.equal(Boolean(result.fresh.needsReview), false);
});

test("quota failure after queuing record write leaves the original record intact", async () => {
  const result = await inDatabase(async () => {
    await seed({ records: [record()] });
    const before = await dump();
    const failingDb = {
      transaction(...args) {
        const tx = db.transaction(...args);
        const objectStore = tx.objectStore.bind(tx);
        tx.objectStore = (name) => {
          const store = objectStore(name);
          if (name === "pendingWrites") store.put = () => { throw new DOMException("Test quota failure", "QuotaExceededError"); };
          return store;
        };
        return tx;
      },
    };
    let error;
    try { await api.stageDraft(failingDb, draft(record("a", "Must roll back"))); } catch (caught) { error = caught.name; }
    return { before, after: await dump(), error };
  });
  assert.equal(result.error, "QuotaExceededError");
  assert.deepEqual(result.after, result.before);
});

test("request success followed by transaction abort never reports a successful save", async () => {
  const result = await inDatabase(async () => {
    await seed({ records: [record()] });
    const before = await dump();
    const failingDb = {
      transaction(...args) {
        const tx = db.transaction(...args);
        const objectStore = tx.objectStore.bind(tx);
        tx.objectStore = (name) => {
          const store = objectStore(name);
          if (name === "pendingWrites") {
            const put = store.put.bind(store);
            store.put = (value) => {
              const request = put(value);
              request.addEventListener("success", () => tx.abort());
              return request;
            };
          }
          return store;
        };
        return tx;
      },
    };
    let rejected = false;
    try { await api.stageDraft(failingDb, draft(record("a", "Must roll back"))); } catch (_) { rejected = true; }
    return { before, after: await dump(), rejected };
  });
  assert.equal(result.rejected, true);
  assert.deepEqual(result.after, result.before);
});

test("snapshot overlays local edits and detects remote conflicts without advancing their baseline", async () => {
  const result = await inDatabase(async () => {
    await api.stageDraft(db, draft(record("a", "Local important edit")));
    const merged = await api.mergeSnapshot(db, { backendUrl: backend, records: [record("a", "Someone else's edit"), record("b")], recordMeta: { a: { modifiedTime: "t1" }, b: { modifiedTime: "tb" } } });
    return { merged, state: await dump(), metadata: await api.getWorkspaceMeta(db, backend) };
  });
  assert.equal(result.merged.records[0].title, "Local important edit");
  assert.equal(result.merged.drafts[0].baseModifiedTime, "t0");
  assert.equal(result.merged.drafts[0].needsReview, true);
  assert.deepEqual(result.state.experiments, result.merged.records);
  assert.equal(result.metadata.a.modifiedTime, "t1");
});

test("unchanged remote baseline allows a pending draft to remain retryable", async () => {
  const result = await inDatabase(async () => {
    await api.stageDraft(db, draft(record("a", "Local edit")));
    return api.mergeSnapshot(db, { backendUrl: backend, records: [record()], recordMeta: { a: { modifiedTime: "t0" } } });
  });
  assert.equal(result.drafts.length, 1);
  assert.equal(Boolean(result.drafts[0].needsReview), false);
  assert.equal(result.drafts[0].baseModifiedTime, "t0");
});

test("equal remote content acknowledges a lost response regardless of key order", async () => {
  const result = await inDatabase(async () => {
    const value = record();
    await api.stageDraft(db, draft(value));
    const reordered = Object.fromEntries(Object.entries(value).reverse());
    reordered.customFields = { unit: "mM", concentration: 2 };
    await api.mergeSnapshot(db, { backendUrl: backend, records: [reordered], recordMeta: { a: { modifiedTime: "t1" } } });
    return dump();
  });
  assert.equal(result.pendingWrites.length, 0);
  assert.equal(result.experiments.length, 1);
  assert.equal(result.experiments[0].content, "<p>Important experiment & image</p>");
});

test("missing remote records and ID collisions require review; new records stay pending", async () => {
  const result = await inDatabase(async () => {
    await api.stageDraft(db, draft(record("a", "Missing remote")));
    await api.stageDraft(db, draft(record("b", "New local with collision"), "rb", ""));
    await api.stageDraft(db, draft(record("c", "New local"), "rc", ""));
    return api.mergeSnapshot(db, { backendUrl: backend, records: [record("b", "Existing remote")], recordMeta: { b: { modifiedTime: "t1" } } });
  });
  const byId = Object.fromEntries(result.drafts.map((value) => [value.recordId, value]));
  assert.equal(byId.a.needsReview, true);
  assert.equal(byId.a.baseModifiedTime, "t0");
  assert.equal(byId.b.needsReview, true);
  assert.equal(byId.b.baseModifiedTime, "");
  assert.equal(Boolean(byId.c.needsReview), false);
  assert.equal(result.records.length, 3);
});

test("merging one workspace preserves all drafts and metadata belonging to another", async () => {
  const result = await inDatabase(async () => {
    const other = "https://other.test.invalid";
    const otherDraft = draft(record("other"), "other-revision", "other-time", other);
    const otherMeta = { backendUrl: other, recordMeta: { other: { modifiedTime: "other-time" } } };
    await seed({ drafts: [otherDraft], metadata: [otherMeta] });
    await api.mergeSnapshot(db, { backendUrl: backend, records: [record()], recordMeta: { a: { modifiedTime: "t0" } } });
    return { state: await dump(), otherDraft, otherMeta, drafts: await api.getDrafts(db, backend) };
  });
  assert.deepEqual(result.state.pendingWrites, [result.otherDraft]);
  assert.deepEqual(result.state.workspaceMeta.find((meta) => meta.backendUrl === result.otherMeta.backendUrl), result.otherMeta);
  assert.deepEqual(result.drafts, []);
});

test("older acknowledgement preserves newer edits and review while advancing the sequential baseline", async () => {
  const result = await inDatabase(async () => {
    const older = draft(record("a", "Older"));
    await api.stageDraft(db, older);
    await api.stageDraft(db, draft(record("a", "Latest"), "r2"));
    await api.updateDraftReview(db, { key: older.key, revision: "r2", reason: "Keep this review" });
    const pending = await api.acknowledgeDraft(db, { key: older.key, revision: "r1", modifiedTime: "t1" });
    const interim = await dump();
    await api.acknowledgeDraft(db, { key: older.key, revision: "r2", modifiedTime: "t2" });
    return { pending, interim, final: await dump(), metadata: await api.getWorkspaceMeta(db, backend) };
  });
  assert.equal(result.pending.revision, "r2");
  assert.equal(result.pending.baseModifiedTime, "t1");
  assert.equal(result.pending.needsReview, true);
  assert.equal(result.pending.reason, "Keep this review");
  assert.equal(result.interim.experiments[0].title, "Latest");
  assert.equal(result.final.experiments[0].title, "Latest");
  assert.deepEqual(result.final.pendingWrites, []);
  assert.equal(result.metadata.a.modifiedTime, "t2");
});

test("review failure from an older revision does not mark a newer draft", async () => {
  const result = await inDatabase(async () => {
    const value = draft(record(), "r2");
    await api.stageDraft(db, value);
    await api.updateDraftReview(db, { key: value.key, revision: "r1", reason: "Stale response" });
    return api.getDrafts(db, backend);
  });
  assert.equal(result[0].revision, "r2");
  assert.equal(Boolean(result[0].needsReview), false);
});

test("interleaved staging and snapshots preserve edits in both transaction orders", async () => {
  const result = await inDatabase(async () => {
    const first = await Promise.all([
      api.stageDraft(db, draft(record("a", "First local"))),
      api.mergeSnapshot(db, { backendUrl: backend, records: [record()], recordMeta: { a: { modifiedTime: "t0" } } }),
    ]);
    const second = await Promise.all([
      api.mergeSnapshot(db, { backendUrl: backend, records: [record()], recordMeta: { a: { modifiedTime: "t0" } } }),
      api.stageDraft(db, draft(record("a", "Latest local"), "r2")),
    ]);
    return { first: first[1], second: second[1], state: await dump() };
  });
  assert.equal(result.first.records[0].title, "First local");
  assert.equal(result.second.record.title, "Latest local");
  assert.equal(result.state.experiments[0].title, "Latest local");
  assert.equal(result.state.pendingWrites[0].revision, "r2");
});

test("invalid snapshots and drafts fail without deleting existing data", async () => {
  const result = await inDatabase(async () => {
    await api.stageDraft(db, draft(record()));
    const before = await dump();
    const failures = [];
    const attempts = [
      () => api.mergeSnapshot(db, { backendUrl: backend, records: [record(), record()] }),
      () => api.mergeSnapshot(db, { backendUrl: backend, records: [{ title: "Missing ID" }] }),
      () => api.mergeSnapshot(db, { backendUrl: backend, records: {}, recordMeta: {} }),
      () => api.mergeSnapshot(db, { backendUrl: backend, records: [], recordMeta: { a: { modifiedTime: 123 } } }),
      () => api.stageDraft(db, { ...draft(record("a", "Bad key")), key: "mismatch" }),
    ];
    for (const operation of attempts) {
      try { await operation(); failures.push(false); } catch (_) { failures.push(true); }
    }
    return { before, after: await dump(), failures };
  });
  assert.deepEqual(result.failures, [true, true, true, true, true]);
  assert.deepEqual(result.after, result.before);
});

test("snapshot failure after clearing rolls back records, drafts, and metadata together", async () => {
  const result = await inDatabase(async () => {
    await api.stageDraft(db, draft(record("a", "Original draft")));
    await seed({ records: [record("b", "Existing research")], metadata: [{ backendUrl: backend, recordMeta: { b: { modifiedTime: "old" } } }] });
    const before = await dump();
    const failingDb = {
      transaction(...args) {
        const tx = db.transaction(...args);
        const objectStore = tx.objectStore.bind(tx);
        tx.objectStore = (name) => {
          const store = objectStore(name);
          if (name === "experiments") store.put = () => { throw new DOMException("Test quota failure", "QuotaExceededError"); };
          return store;
        };
        return tx;
      },
    };
    let rejected = false;
    try {
      await api.mergeSnapshot(failingDb, { backendUrl: backend, records: [record("a", "Original draft")], recordMeta: { a: { modifiedTime: "new" } } });
    } catch (_) { rejected = true; }
    return { before, after: await dump(), rejected };
  });
  assert.equal(result.rejected, true);
  assert.deepEqual(result.after, result.before);
});
