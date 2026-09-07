"use strict";

const assert = require("node:assert/strict");
const vm = require("node:vm");
const { test } = require("node:test");
const { createServer } = require("./helpers/server");

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const workspace = { recordsFolderId: "records", assetsFolderId: "assets", configFileId: "config" };
const plain = (value) => JSON.parse(JSON.stringify(value));

test("GET /workspace loads an existing notebook using only Drive reads", async () => {
  const { server, routes } = createServer();
  const requests = [];
  server.fetch = async (url, options) => {
    const parsed = new URL(url);
    requests.push({ url, method: options.method || "GET" });
    assert.equal(options.headers.Authorization, "Bearer fake-token");
    let data;
    if (parsed.searchParams.get("alt") === "media") {
      data = parsed.pathname.endsWith("/config") ? { taxonomy: { saved: true } } : { id: "a", text: "Saved data" };
    } else {
      const query = parsed.searchParams.get("q");
      if (query.includes("name = 'records'")) data = { files: [{ id: "records" }] };
      else if (query.includes("name = 'assets'")) data = { files: [{ id: "assets" }] };
      else if (query.includes("name = 'definitely-not-notion.config.json'")) data = { files: [{ id: "config" }] };
      else data = { files: [{ id: "a", name: "a.json", version: "1", modifiedTime: "saved-time" }] };
    }
    return { ok: true, status: 200, headers: { get: () => "application/json" }, json: async () => data };
  };
  const snapshot = await new Promise((resolve, reject) => {
    routes.get("GET /workspace")({}, { json: resolve }, reject);
  });
  assert.deepEqual(plain(snapshot), {
    taxonomy: { saved: true }, records: [{ id: "a", text: "Saved data" }],
    recordMeta: { a: { fileId: "a", modifiedTime: "saved-time" } },
  });
  assert.equal(requests.length, 6);
  assert.ok(requests.every((request) => request.method === "GET"));
});

test("workspace reads overlap config/listing, read six records at once, and preserve ordering", async () => {
  const { server } = createServer();
  const configGate = deferred();
  const firstBatch = deferred();
  const recordGate = deferred();
  const files = Array.from({ length: 17 }, (_, index) => ({
    id: `file-${index}`, name: `${index}.json`, version: "1", modifiedTime: `time-${index}`,
  }));
  let listed = false;
  let active = 0;
  let peak = 0;
  server.driveListChildren = async () => { listed = true; return files; };
  server.driveReadJson = async (id) => {
    if (id === "config") { await configGate.promise; return { taxonomy: { category: ["Lab"] } }; }
    active += 1;
    peak = Math.max(peak, active);
    if (active === 6) firstBatch.resolve();
    await recordGate.promise;
    active -= 1;
    return { id: id.replace("file-", ""), content: `Original ${id}` };
  };
  const pending = server.readWorkspace(workspace);
  assert.equal(listed, true, "listing starts before config returns");
  configGate.resolve();
  await firstBatch.promise;
  assert.equal(active, 6);
  recordGate.resolve();
  const snapshot = plain(await pending);
  assert.equal(peak, 6);
  assert.deepEqual(snapshot.records.map((record) => record.id), files.map((_, index) => String(index)));
  assert.deepEqual(snapshot.recordMeta["16"], { fileId: "file-16", modifiedTime: "time-16" });
  assert.deepEqual(snapshot.taxonomy, { category: ["Lab"] });
});

test("warm snapshots revalidate metadata, reuse unchanged bodies, and pick up external edits/removals", async () => {
  const { server } = createServer();
  let files = [
    { id: "a", name: "a.json", version: "1", modifiedTime: "same-time" },
    { id: "b", name: "b.json", version: "1", modifiedTime: "time-b" },
  ];
  let bodyA = { id: "a", text: "Original" };
  let taxonomy = { groups: ["Original"] };
  let listingCalls = 0;
  const downloads = [];
  server.driveListChildren = async () => { listingCalls += 1; return files; };
  server.driveReadJson = async (id) => {
    downloads.push(id);
    return id === "config" ? { taxonomy } : id === "a" ? bodyA : { id: "b" };
  };
  await server.readWorkspace(workspace);
  await server.readWorkspace(workspace);
  assert.deepEqual(downloads, ["config", "a", "b", "config"]);
  bodyA = { id: "a", text: "Externally edited" };
  taxonomy = { groups: ["Externally edited"] };
  files = [{ ...files[0], version: "2" }]; // Same timestamp; new Drive version.
  const snapshot = plain(await server.readWorkspace(workspace));
  assert.equal(listingCalls, 3);
  assert.deepEqual(downloads, ["config", "a", "b", "config", "config", "a"]);
  assert.deepEqual(snapshot.records, [bodyA]);
  assert.deepEqual(snapshot.taxonomy, taxonomy);
  assert.deepEqual(Object.keys(snapshot.recordMeta), ["a"]);
});

test("record bodies without a revision are never cached, and invalid records are skipped", async () => {
  const { server } = createServer();
  let recordReads = 0;
  server.driveListChildren = async () => [
    { id: "a", name: "a.json" }, { id: "broken", name: "broken.json" }, { id: "asset", name: "image.png" },
  ];
  server.driveReadJson = async (id) => {
    if (id === "config") return {};
    recordReads += 1;
    return id === "a" ? { id: "a" } : {};
  };
  await server.readWorkspace(workspace);
  assert.deepEqual(plain((await server.readWorkspace(workspace)).records), [{ id: "a" }]);
  assert.equal(recordReads, 4);
});

test("concurrent record reads share downloads and failed downloads can be retried", async () => {
  const { server } = createServer();
  const gate = deferred();
  let calls = 0;
  server.driveReadJson = async () => { calls += 1; return gate.promise; };
  const file = { id: "a", version: "1" };
  const first = server.readRecordFile(file);
  const second = server.readRecordFile(file);
  assert.equal(calls, 1);
  gate.reject(new Error("temporary Drive failure"));
  const results = await Promise.allSettled([first, second]);
  assert.ok(results.every((result) => result.status === "rejected"));
  server.driveReadJson = async () => { calls += 1; return { id: "a", text: "Recovered" }; };
  assert.equal((await server.readRecordFile(file)).text, "Recovered");
  assert.equal(calls, 2);
});

test("a failed record download rejects the whole snapshot instead of returning partial data", async () => {
  const { server } = createServer();
  server.driveListChildren = async () => [
    { id: "a", name: "a.json", version: "1" }, { id: "b", name: "b.json", version: "1" },
  ];
  server.driveReadJson = async (id) => {
    if (id === "b") throw new Error("Drive unavailable");
    return id === "config" ? {} : { id };
  };
  await assert.rejects(server.readWorkspace(workspace), /Drive unavailable/);
  server.driveReadJson = async (id) => id === "config" ? {} : { id };
  assert.deepEqual(plain((await server.readWorkspace(workspace)).records), [{ id: "a" }, { id: "b" }]);
});

test("an older in-flight download cannot make later metadata reuse stale record content", async () => {
  const { server } = createServer();
  const oldGate = deferred();
  let calls = 0;
  server.driveReadJson = async () => {
    calls += 1;
    return calls === 1 ? oldGate.promise : { id: "a", text: "new" };
  };
  const oldRead = server.readRecordFile({ id: "a", version: "1" });
  assert.equal((await server.readRecordFile({ id: "a", version: "2" })).text, "new");
  oldGate.resolve({ id: "a", text: "old" });
  await oldRead;
  assert.equal((await server.readRecordFile({ id: "a", version: "2" })).text, "new");
});

test("record cache evicts old entries at its memory/entry limits", async () => {
  const { server } = createServer();
  let calls = 0;
  server.driveReadJson = async (id) => { calls += 1; return { id }; };
  for (let index = 0; index < 1001; index += 1) {
    await server.readRecordFile({ id: String(index), version: "1" });
  }
  assert.equal(vm.runInContext("recordCache.size", server), 1000);
  assert.ok(vm.runInContext("recordCacheBytes <= RECORD_CACHE_MAX_BYTES", server));
  await server.readRecordFile({ id: "0", version: "1" });
  assert.equal(calls, 1002);

  server.driveReadJson = async () => ({ id: "large", text: "x".repeat(33 * 1024 * 1024) });
  await server.readRecordFile({ id: "large", version: "1" });
  assert.equal(vm.runInContext('recordCache.has("large")', server), false);
});

test("pagination follows empty intermediate pages and includes all record metadata", async () => {
  const { server } = createServer();
  const pageTokens = [];
  server.driveRequest = async (url) => {
    const params = new URL(url).searchParams;
    assert.match(params.get("fields"), /nextPageToken/);
    assert.match(params.get("fields"), /version/);
    const token = params.get("pageToken");
    pageTokens.push(token);
    if (!token) return { files: [{ id: "a" }], nextPageToken: "page-2" };
    if (token === "page-2") return { files: [], nextPageToken: "page-3" };
    return { files: [{ id: "b" }] };
  };
  assert.deepEqual(plain(await server.driveListChildren("records")), [{ id: "a" }, { id: "b" }]);
  assert.deepEqual(pageTokens, [null, "page-2", "page-3"]);
});

test("parallel cold connections discover/create the workspace once and preserve existing config", async () => {
  const { server } = createServer();
  const gate = deferred();
  const folders = [];
  let configLookups = 0;
  server.driveEnsureFolder = async (parent, name) => { folders.push(name); await gate.promise; return name; };
  server.driveFindChild = async () => { configLookups += 1; return { id: "saved-config" }; };
  server.driveCreateJson = async () => { throw new Error("Existing config must not be overwritten"); };
  const first = server.ensureWorkspace({ userSeed: true });
  const second = server.ensureWorkspace({ otherSeed: true });
  assert.deepEqual(folders, ["records", "assets"]);
  assert.equal(configLookups, 1);
  gate.resolve();
  const values = await Promise.all([first, second]);
  assert.equal(values[0], values[1]);
  assert.equal(values[0].configFileId, "saved-config");
});

test("failed workspace discovery waits for in-flight discovery and can recover", async () => {
  const { server } = createServer();
  const gate = deferred();
  server.driveEnsureFolder = async (parent, name) => {
    if (name === "records") throw new Error("Temporary failure");
    await gate.promise;
    return name;
  };
  server.driveFindChild = async () => ({ id: "config" });
  const pending = server.ensureWorkspace();
  let settled = false;
  pending.catch(() => { settled = true; });
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(settled, false);
  gate.resolve();
  await assert.rejects(pending, /Temporary failure/);
  server.driveEnsureFolder = async (parent, name) => name;
  assert.deepEqual(plain(await server.ensureWorkspace()), workspace);
});

test("simultaneous init requests seed an empty workspace only once; populated data is untouched", async () => {
  const { server, routes } = createServer();
  const stored = [];
  server.ensureWorkspace = async () => workspace;
  server.readWorkspace = async () => ({ taxonomy: { saved: true }, records: [...stored], recordMeta: {} });
  server.upsertRecord = async (folder, record) => { stored.push(record); };
  const callInit = (records) => new Promise((resolve, reject) => {
    routes.get("POST /workspace/init")({ body: { records, taxonomy: { seed: true } } }, { json: resolve }, reject);
  });
  const [first, second] = await Promise.all([
    callInit([{ id: "saved", text: "first" }]),
    callInit([{ id: "saved", text: "must not overwrite" }]),
  ]);
  assert.deepEqual(stored, [{ id: "saved", text: "first" }]);
  assert.deepEqual(plain(first), plain(second));
  await callInit([{ id: "replacement" }]);
  assert.deepEqual(stored, [{ id: "saved", text: "first" }]);
});

test("writes still check fresh Drive metadata for conflicts even when a body is cached", async () => {
  const { server } = createServer();
  server.driveReadJson = async () => ({ id: "a", text: "cached" });
  await server.readRecordFile({ id: "a", version: "1", modifiedTime: "old" });
  let writes = 0;
  server.driveFindChild = async () => ({ id: "a", modifiedTime: "new" });
  server.driveRequest = async (url, options) => {
    writes += 1;
    assert.equal(options.method, "PATCH");
    return { id: "a", modifiedTime: "saved" };
  };
  await assert.rejects(server.upsertRecord("records", { id: "a" }, "old"), (error) => error.status === 409);
  assert.equal(writes, 0);
  const saved = await server.upsertRecord("records", { id: "a" }, "new");
  assert.equal(saved.modifiedTime, "saved");
  assert.equal(writes, 1);
  assert.equal(vm.runInContext('recordCache.has("a")', server), false);
});

test("parallel Drive requests share token acquisition and retry after an auth failure", async () => {
  const { server, credentials } = createServer();
  const gate = deferred();
  const started = deferred();
  let calls = 0;
  credentials.getAccessToken = async () => { calls += 1; started.resolve(); return gate.promise; };
  const first = server.getDriveAccessToken();
  const second = server.getDriveAccessToken();
  await started.promise;
  assert.equal(calls, 1);
  gate.reject(new Error("auth unavailable"));
  const failures = await Promise.allSettled([first, second]);
  assert.ok(failures.every((result) => result.status === "rejected"));
  credentials.getAccessToken = async () => { calls += 1; return { token: "recovered" }; };
  assert.equal(await server.getDriveAccessToken(), "recovered");
  assert.equal(calls, 2);
});
