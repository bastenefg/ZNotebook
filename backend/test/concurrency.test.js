"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { createServer } = require("./helpers/server");
const { createFakeDrive, rendezvous, clone, response } = require("./helpers/fake-drive");

const workspace = { recordsFolderId: "records", assetsFolderId: "assets", configFileId: "config" };
const original = { id: "experiment-a", title: "Synthetic experiment", content: "Original synthetic observations",
  customFields: { reagent: "synthetic" }, photos: [{ driveFileId: "attachment-a", caption: "Preserve reference" }],
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" };
const archived = { ...original, id: "archived-b", content: "Archived synthetic observations", deletedAt: "2026-01-02T00:00:00Z" };
const metadata = { description: "Preserve metadata", appProperties: { experiment: "synthetic" }, owners: [{ emailAddress: "owner@example.invalid" }] };

function fixture() {
  const drive = createFakeDrive({ records: [
    { fileId: "physical-a", record: original, metadata },
    { fileId: "physical-archived", record: archived, metadata },
  ] });
  drive.addFile("attachment-a", "existing-image.png", "assets", { bytes: "synthetic-attachment-bytes" }, "image/png", metadata);
  return drive;
}

function instance(drive, name, env = { RECORD_ID_REGISTRY_FILE_ID: "registry" }) {
  const result = createServer({ env });
  result.server.fetch = drive.fetchFor(name);
  return result;
}

async function revision(server, fileId = "physical-a") {
  return (await server.driveReadVersionedJson(fileId)).metadata;
}

function token(metadata) {
  return `d3.${Buffer.from(JSON.stringify([metadata.id, metadata.etag, metadata.headRevisionId])).toString("base64url")}`;
}

function legacyToken(metadata) {
  return `d2.${Buffer.from(JSON.stringify([metadata.id, metadata.etag, String(metadata.version)])).toString("base64url")}`;
}

const isConflict = (error) => error.status === 409;
const mutationRequests = (drive) => drive.requests.filter((request) => request.method !== "GET");
const staticMetadata = ({ etag, version, headRevisionId, modifiedDate, ...rest }) => rest;

function assertUnrelatedPreserved(drive, before) {
  const after = drive.snapshot();
  for (const id of ["physical-archived", "attachment-a", "config"]) {
    assert.deepEqual(after.find((file) => file.id === id), before.find((file) => file.id === id), `${id} content and metadata must remain exact`);
  }
}

test("two independent servers start uploads before either final commit: one wins and one receives conflict", async () => {
  const drive = fixture();
  const before = drive.snapshot();
  const a = instance(drive, "server-A").server;
  const b = instance(drive, "server-B").server;
  assert.notEqual(a, b, "test must use independent server VM state, not one process queue");
  const [firstMeta, secondMeta] = await Promise.all([revision(a), revision(b)]);
  assert.equal(token(firstMeta), token(secondMeta));
  const editedA = { ...original, content: "User A synthetic edit", updatedAt: "2026-01-02T00:00:00Z" };
  const editedB = { ...original, content: "User B synthetic edit", updatedAt: "2026-01-03T00:00:00Z" };
  drive.hooks.beforeCommit = rendezvous(2, (event) => event.fileId === "physical-a");
  const results = await Promise.allSettled([
    a.upsertRecord("records", editedA, token(firstMeta)),
    b.upsertRecord("records", editedB, token(secondMeta)),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected" && result.reason.status === 409).length, 1);
  assert.equal(drive.sessions.size, 2, "both resumable sessions successfully started before the winner wrote");
  assert.equal(drive.commits.filter((event) => event.fileId === "physical-a").length, 1);
  const saved = drive.files.get("physical-a");
  assert.deepEqual(saved.data, results[0].status === "fulfilled" ? editedA : editedB);
  assert.deepEqual(saved.data.photos, original.photos);
  assert.deepEqual(staticMetadata(saved.metadata), staticMetadata(before.find((file) => file.id === "physical-a").metadata));
  assert.equal(drive.files.size, before.length);
  const finalRequests = drive.requests.filter((request) => request.url.includes("upload_id="));
  assert.equal(finalRequests.length, 2);
  assert.ok(finalRequests.every((request) => request.headers["if-match"] === firstMeta.etag), "the final byte requests themselves must retain the observed ETag");
  assertUnrelatedPreserved(drive, before);
});

test("missing, stale, malformed, wrong-file baselines and force cannot overwrite an existing record", async () => {
  const drive = fixture();
  const { server } = instance(drive, "writer");
  const baseline = token(await revision(server));
  const other = token(await revision(server, "physical-archived"));
  drive.externalUpdate("physical-a", { ...original, content: "A newer external edit" });
  const before = drive.snapshot();
  for (const base of ["", "not-a-revision", baseline, other]) {
    await assert.rejects(server.upsertRecord("records", { ...original, content: "Must not overwrite" }, base), isConflict);
  }
  await assert.rejects(server.upsertRecord("records", original, token(await revision(server)), true), isConflict);
  assert.deepEqual(drive.snapshot(), before);
  assert.equal(mutationRequests(drive).length, 0);
});

test("a metadata-only Drive version advance does not invalidate the returned content baseline", async () => {
  const drive = fixture();
  const before = drive.snapshot();
  const { server } = instance(drive, "sequential-writer");
  const first = await server.upsertRecord("records", { ...original, content: "First phone edit" }, token(await revision(server)));
  const file = drive.files.get("physical-a");
  const contentMetadata = clone(file.metadata);
  // Real Drive has been observed incrementing version later while these
  // content identity fields remain exactly the upload response's values.
  file.metadata.version = String(Number(file.metadata.version) + 1);
  assert.equal(file.metadata.etag, contentMetadata.etag);
  assert.equal(file.metadata.headRevisionId, contentMetadata.headRevisionId);
  assert.equal(file.metadata.modifiedDate, contentMetadata.modifiedDate);
  const secondRecord = { ...original, content: "Second phone edit after metadata bookkeeping" };
  const second = await server.upsertRecord("records", secondRecord, first.revision);
  assert.deepEqual(file.data, secondRecord);
  assert.notEqual(second.revision, first.revision);
  assert.equal(drive.commits.filter(event => event.fileId === "physical-a").length, 2);
  assertUnrelatedPreserved(drive, before);
});

test("workspace exposes stable content tokens and an exact legacy migration baseline", async () => {
  const drive = fixture();
  const { server } = instance(drive, "metadata-reader");
  const first = clone(await server.readWorkspace(workspace));
  const file = drive.files.get("physical-a");
  file.metadata.version = String(Number(file.metadata.version) + 1);
  const second = clone(await server.readWorkspace(workspace));
  assert.equal(second.recordMeta[original.id].revision, first.recordMeta[original.id].revision);
  assert.notEqual(second.recordMeta[original.id].legacyRevision, first.recordMeta[original.id].legacyRevision);
  assert.equal(second.recordMeta[original.id].legacyRevision, legacyToken(file.metadata));
  assert.deepEqual(second.records, first.records);
  assert.equal(mutationRequests(drive).length, 0);
});

test("legacy baselines migrate only while their entire original revision still matches", async () => {
  const drive = fixture();
  const { server } = instance(drive, "legacy-writer");
  const baseline = legacyToken(await revision(server));
  const saved = await server.upsertRecord("records", { ...original, content: "Exact legacy baseline edit" }, baseline);
  assert.ok(saved.revision.startsWith("d3."));
  assert.equal(saved.legacyRevision, legacyToken(drive.files.get("physical-a").metadata));
  const exactCurrentLegacy = saved.legacyRevision;
  drive.files.get("physical-a").metadata.version = String(Number(drive.files.get("physical-a").metadata.version) + 1);
  const before = drive.snapshot();
  await assert.rejects(server.upsertRecord("records", { ...original, content: "Unproven legacy retry" }, exactCurrentLegacy), isConflict);
  assert.deepEqual(drive.snapshot(), before);
});

test("real content changes still invalidate d3 baselines when modifiedDate is preserved", async () => {
  const drive = fixture();
  const { server } = instance(drive, "stale-writer");
  const initial = await revision(server);
  drive.externalUpdate("physical-a", { ...original, content: "Another editor's saved observations" });
  drive.files.get("physical-a").metadata.modifiedDate = initial.modifiedDate;
  drive.files.get("physical-a").metadata.etag = initial.etag;
  const before = drive.snapshot();
  await assert.rejects(server.upsertRecord("records", { ...original, content: "Must not overwrite" }, token(initial)), isConflict);
  assert.deepEqual(drive.snapshot(), before);
  assert.equal(mutationRequests(drive).length, 0);
});

test("old-client and forced HTTP payloads fail before touching Drive", async () => {
  const drive = fixture();
  const { routes } = instance(drive, "old-client");
  for (const body of [
    { record: original, lastKnownModifiedTime: "legacy-time" },
    { record: original, writeProtocol: 2 },
    { record: original, writeProtocol: 2, baseRevision: "", force: true },
  ]) {
    await assert.rejects(new Promise((resolve, reject) => routes.get("PUT /records/:id")(
      { params: { id: original.id }, body }, { json: resolve, status() { return this; } }, reject,
    )), isConflict);
  }
  assert.equal(drive.requests.length, 0);
});

test("different records can commit concurrently through different server instances", async () => {
  const drive = fixture();
  const a = instance(drive, "server-A").server;
  const b = instance(drive, "server-B").server;
  const [baseA, baseB] = await Promise.all([revision(a), revision(b, "physical-archived")]);
  drive.hooks.beforeCommit = rendezvous(2, (event) => event.kind === "update");
  const first = { ...original, content: "Independent update A" };
  const second = { ...archived, content: "Independent update B" };
  await Promise.all([
    a.upsertRecord("records", first, token(baseA)),
    b.upsertRecord("records", second, token(baseB)),
  ]);
  assert.deepEqual(drive.files.get("physical-a").data, first);
  assert.deepEqual(drive.files.get("physical-archived").data, second);
  assert.equal(drive.commits.length, 2);
});

test("an accepted write with a lost response is visible exactly in the next read and stale retry cannot overwrite it", async () => {
  const drive = fixture();
  const before = drive.snapshot();
  const writer = instance(drive, "writer").server;
  const reader = instance(drive, "fresh-reader").server;
  const base = token(await revision(writer));
  const edit = { ...original, content: "Accepted synthetic write with lost response" };
  drive.hooks.afterCommit = () => { throw new TypeError("Synthetic response dropped after commit"); };
  await assert.rejects(writer.upsertRecord("records", edit, base), /response dropped/);
  drive.hooks.afterCommit = null;
  const snapshot = clone(await reader.readWorkspace(workspace));
  assert.deepEqual(snapshot.records.find((record) => record.id === original.id), edit);
  assert.notEqual(snapshot.recordMeta[original.id].revision, base);
  await assert.rejects(writer.upsertRecord("records", { ...edit, content: "Blind retry would erase accepted content" }, base), isConflict);
  assert.equal(drive.commits.length, 1);
  assert.deepEqual(drive.files.get("physical-a").data, edit);
  assertUnrelatedPreserved(drive, before);
});

for (const sameContent of [false, true]) {
  test(`concurrent new logical IDs share one physical ID; ${sameContent ? "identical create retries reconcile" : "different payloads conflict"}`, async () => {
    const drive = fixture();
    const before = drive.snapshot();
    const a = instance(drive, "creator-A").server;
    const b = instance(drive, "creator-B").server;
    const registryBarrier = rendezvous(2, (event) => event.fileId === "registry" && event.kind === "update");
    const createBarrier = rendezvous(2, (event) => event.kind === "create");
    drive.hooks.beforeCommit = async (event) => { await registryBarrier(event); await createBarrier(event); };
    const recordA = { ...original, id: "new-shared-id", content: "Creator A synthetic input" };
    const recordB = sameContent ? clone(recordA) : { ...recordA, content: "Creator B synthetic input" };
    const results = await Promise.allSettled([a.upsertRecord("records", recordA), b.upsertRecord("records", recordB)]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, sameContent ? 2 : 1);
    if (!sameContent) assert.equal(results.find((result) => result.status === "rejected").reason.status, 409);
    const created = drive.snapshot().filter((file) => file.metadata.title === "new-shared-id.json");
    assert.equal(created.length, 1, "Drive may have duplicate names, so ID reservation must prevent them");
    assert.equal(drive.commits.filter((event) => event.kind === "create").length, 1);
    assert.equal(drive.files.get("registry").data.records[recordA.id], created[0].id);
    assert.equal(drive.files.size, before.length + 1);
    assertUnrelatedPreserved(drive, before);
    assert.deepEqual(drive.files.get("physical-a").data, original);
  });
}

test("registry retries only a confirmed 412 and does not retry ambiguous network failure", async () => {
  const drive = fixture();
  const { server } = instance(drive, "creator");
  let first = true;
  drive.hooks.beforeCommit = (event) => {
    if (event.fileId === "registry" && first) {
      first = false;
      drive.externalUpdate("registry", { schema: 1, records: { another: "previously-reserved-id" } });
    }
  };
  await server.upsertRecord("records", { id: "created-after-cas-retry", title: "Synthetic" });
  assert.equal([...drive.sessions.values()].filter((session) => session.fileId === "registry").length, 2);
  assert.equal(drive.files.get("registry").data.records.another, "previously-reserved-id");

  const failedDrive = fixture();
  const failedServer = instance(failedDrive, "failed-creator").server;
  failedDrive.hooks.beforeCommit = (event) => {
    if (event.fileId === "registry") throw new TypeError("Synthetic ambiguous network failure");
  };
  await assert.rejects(failedServer.upsertRecord("records", { id: "must-remain-local", title: "Synthetic" }), /ambiguous network failure/);
  assert.equal(failedDrive.sessions.size, 1);
  assert.equal(failedDrive.commits.length, 0);
  assert.ok(!failedDrive.snapshot().some((file) => file.data.id === "must-remain-local"));
});

test("missing registry configuration blocks new records with 503 and makes no storage mutations", async () => {
  const drive = fixture();
  const { server } = instance(drive, "unconfigured-creator", {});
  const before = drive.snapshot();
  await assert.rejects(server.upsertRecord("records", { id: "new-unconfigured", title: "Synthetic" }), (error) => error.status === 503);
  assert.equal(mutationRequests(drive).length, 0);
  assert.deepEqual(drive.snapshot(), before);
});

test("duplicate filenames and missing versioned records fail closed without recreating or choosing one", async () => {
  const duplicateDrive = fixture();
  const duplicateServer = instance(duplicateDrive, "duplicate-check").server;
  const base = token(await revision(duplicateServer));
  duplicateDrive.addFile("duplicate-a", `${original.id}.json`, "records", original);
  const before = duplicateDrive.snapshot();
  await assert.rejects(duplicateServer.upsertRecord("records", original, base), isConflict);
  await assert.rejects(duplicateServer.readWorkspace(workspace), isConflict);
  assert.equal(mutationRequests(duplicateDrive).length, 0);
  assert.deepEqual(duplicateDrive.snapshot(), before);

  const missingDrive = fixture();
  const missingServer = instance(missingDrive, "missing-check").server;
  const missingBase = token(await revision(missingServer));
  missingDrive.files.delete("physical-a"); // Synthetic external removal, never a live Drive operation.
  await assert.rejects(missingServer.upsertRecord("records", original, missingBase), isConflict);
  assert.equal(mutationRequests(missingDrive).length, 0);
  assert.ok(!missingDrive.snapshot().some((file) => file.data.id === original.id));
});

test("malformed registry content remains intact and prevents new record creation", async () => {
  for (const invalid of [{ schema: 2, records: {} }, { schema: 1, records: [] }, { schema: 1, records: { unsafe: "invalid/file/id" } }]) {
    const drive = fixture();
    drive.externalUpdate("registry", invalid);
    const before = drive.snapshot();
    const { server } = instance(drive, "registry-validation");
    await assert.rejects(server.upsertRecord("records", { id: "must-not-be-created" }), /registry is invalid/);
    assert.equal(mutationRequests(drive).length, 0);
    assert.deepEqual(drive.snapshot(), before);
  }
});

test("untrusted upload locations and HTTP 500 responses cannot cause a fallback overwrite or automatic retry", async () => {
  const untrustedDrive = fixture();
  const untrustedServer = instance(untrustedDrive, "destination-check").server;
  const base = token(await revision(untrustedServer));
  untrustedDrive.hooks.beforeRequest = (request) => {
    if (request.method === "PUT") return response(200, {}, { location: "https://untrusted.example.invalid/upload" });
  };
  await assert.rejects(untrustedServer.upsertRecord("records", { ...original, content: "Must remain local" }, base), /unexpected upload destination/);
  assert.equal(untrustedDrive.requests.filter((request) => request.method === "PUT").length, 1);
  assert.equal(untrustedDrive.commits.length, 0);
  assert.deepEqual(untrustedDrive.files.get("physical-a").data, original);

  const failedDrive = fixture();
  const failedServer = instance(failedDrive, "http-failure").server;
  failedDrive.hooks.beforeRequest = (request) => {
    if (request.url.includes("upload_id=")) return response(500, { error: { message: "Synthetic Drive server failure" } });
  };
  await assert.rejects(failedServer.upsertRecord("records", { id: "failed-http-record" }), (error) => error.status === 502);
  assert.equal(failedDrive.sessions.size, 1, "HTTP 500 during registry save must not enter CAS retry path");
  assert.equal(failedDrive.commits.length, 0);
});

test("registry retries stop after six CAS conflicts and never retry unrelated status errors", async () => {
  const busyDrive = fixture();
  const busyServer = instance(busyDrive, "busy-creator").server;
  busyDrive.hooks.beforeCommit = (event) => {
    if (event.fileId === "registry") busyDrive.externalUpdate("registry", { schema: 1, records: {} });
  };
  await assert.rejects(busyServer.upsertRecord("records", { id: "busy-new-record" }), (error) => error.status === 503);
  assert.equal(busyDrive.sessions.size, 6, "registry contention must have a finite retry budget");
  assert.equal(busyDrive.commits.length, 0);
  assert.equal(busyDrive.requests.filter((request) => request.path.endsWith("/generateIds")).length, 1, "retry reuses the original reserved physical ID");

  for (const status of [409, 429, 500]) {
    const drive = fixture();
    const server = instance(drive, `failed-${status}`).server;
    drive.hooks.beforeCommit = (event) => {
      if (event.fileId === "registry") throw Object.assign(new Error(`Synthetic non-CAS ${status}`), { status });
    };
    await assert.rejects(server.upsertRecord("records", { id: `must-remain-local-${status}` }), (error) => error.status === status);
    assert.equal(drive.sessions.size, 1, `non-CAS ${status} must not be retried`);
    assert.equal(drive.commits.length, 0);
  }
});

test("workspace pairs bytes with their exact pinned revision even when the file updates after metadata read", async () => {
  const drive = fixture();
  const { server } = instance(drive, "reader");
  const initialMeta = clone(drive.files.get("physical-a").metadata);
  let changed = false;
  drive.hooks.afterMetadataRead = ({ fileId }) => {
    if (fileId === "physical-a" && !changed) {
      changed = true;
      drive.externalUpdate(fileId, { ...original, content: "Newer external content during read" });
    }
  };
  const first = clone(await server.readWorkspace(workspace));
  assert.deepEqual(first.records.find((record) => record.id === original.id), original);
  assert.equal(first.recordMeta[original.id].revision, token(initialMeta));
  const second = clone(await server.readWorkspace(workspace));
  assert.equal(second.records.find((record) => record.id === original.id).content, "Newer external content during read");
  assert.notEqual(second.recordMeta[original.id].revision, first.recordMeta[original.id].revision);
  await assert.rejects(server.upsertRecord("records", { ...original, content: "Stale snapshot edit" }, first.recordMeta[original.id].revision), isConflict);
  assert.ok(drive.requests.filter((request) => request.path.includes("/v2/") && request.url.includes("alt=media")).every((request) => new URL(request.url).searchParams.get("revisionId")), "record media never fall back to unpinned live bytes");
  assert.equal(mutationRequests(drive).length, 0);
});

test("GET /workspace reads existing files and never creates, patches or updates anything", async () => {
  const drive = fixture();
  const before = drive.snapshot();
  const { routes } = instance(drive, "read-only-route");
  const snapshot = clone(await new Promise((resolve, reject) => routes.get("GET /workspace")({}, { json: resolve }, reject)));
  assert.deepEqual(snapshot.records, [original, archived]);
  assert.ok(snapshot.recordMeta[original.id].revision.startsWith("d3."));
  assert.equal(mutationRequests(drive).length, 0);
  assert.deepEqual(drive.snapshot(), before);
});
