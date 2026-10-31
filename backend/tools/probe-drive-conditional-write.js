"use strict";

// Opt-in integration contract check. Creates NEW synthetic files in a NEW root
// folder, never accepts an existing destination/file ID, and never deletes files.
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { OAuth2Client } = require("google-auth-library");

async function main() {
  assert.ok(process.argv.includes("--allow-create-isolated-test-data"), "Explicit isolated-test opt-in is required.");
  const auth = new OAuth2Client(process.env.DRIVE_OWNER_CLIENT_ID, process.env.DRIVE_OWNER_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: process.env.DRIVE_OWNER_REFRESH_TOKEN });
  const access = await auth.getAccessToken();
  const token = typeof access === "string" ? access : access.token;
  const createdIds = new Set();
  const request = async (url, options = {}) => fetch(url, {
    ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
  });
  const jsonRequest = async (url, options = {}) => {
    const response = await request(url, options);
    assert.ok(response.ok, `Synthetic Drive request failed (${response.status}).`);
    return response.json();
  };
  const folder = await jsonRequest("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: `ZNotebook ISOLATED concurrency test ${new Date().toISOString()} ${randomUUID()}`, mimeType: "application/vnd.google-apps.folder" }),
  });
  const original = { id: "synthetic-contract-record", content: "Original synthetic bytes; no research data." };
  const generated = await jsonRequest("https://www.googleapis.com/drive/v3/files/generateIds?count=1&space=drive&type=files");
  assert.ok(generated.ids?.[0], "A synthetic generated file ID is required.");
  const boundary = `probe_${randomUUID()}`;
  const metadata = { id: generated.ids[0], name: "SYNTHETIC-conditional-write.json", parents: [folder.id], mimeType: "application/json" };
  const createOptions = {
    method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body: `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(original)}\r\n--${boundary}--\r\n`,
  };
  const createUrl = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id";
  const created = await jsonRequest(createUrl, createOptions);
  assert.equal(created.id, generated.ids[0]);
  createdIds.add(created.id);
  // These IDs are non-secret and identify only newly created test artifacts.
  console.log(JSON.stringify({ testFolderId: folder.id, syntheticFileId: created.id }));
  const metaUrl = `https://www.googleapis.com/drive/v2/files/${encodeURIComponent(created.id)}?fields=id,title,mimeType,parents,etag,version,headRevisionId,modifiedDate,md5Checksum`;
  const metadataBefore = await jsonRequest(metaUrl);
  assert.ok(metadataBefore.etag && metadataBefore.headRevisionId, "The synthetic binary file must expose an ETag and a head revision.");
  const readRevision = (revision) => jsonRequest(`https://www.googleapis.com/drive/v2/files/${encodeURIComponent(created.id)}?alt=media&revisionId=${encodeURIComponent(revision)}`);
  assert.deepEqual(await readRevision(metadataBefore.headRevisionId), original);
  const duplicate = await request(createUrl, { ...createOptions, body: createOptions.body.replace(JSON.stringify(original), JSON.stringify({ ...original, content: "Duplicate ID must not replace original" })) });
  assert.equal(duplicate.status, 409, "Repeated creation of the same generated ID must fail without overwriting.");
  assert.equal((await jsonRequest(metaUrl)).md5Checksum, metadataBefore.md5Checksum);
  const begin = async (etag, value) => {
    assert.ok(createdIds.has(created.id), "Only a file created by this process may be modified.");
    const body = JSON.stringify(value);
    const response = await request(`https://www.googleapis.com/upload/drive/v2/files/${encodeURIComponent(created.id)}?uploadType=resumable&newRevision=true&fields=id,etag,version,modifiedDate,headRevisionId`, {
      method: "PUT", headers: { "Content-Type": "application/json", "If-Match": etag, "X-Upload-Content-Type": "application/json", "X-Upload-Content-Length": String(Buffer.byteLength(body)) }, body: "{}",
    });
    const location = response.headers.get("location");
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      return { status: response.status, reason: detail.error?.message?.slice(0, 200) || "" };
    }
    assert.ok(location && new URL(location).origin === "https://www.googleapis.com", "Unexpected synthetic upload origin.");
    return { status: response.status, location, body, etag };
  };
  const finish = async (session) => {
    if (!session.location) return session;
    const response = await request(session.location, {
      method: "PUT", headers: { "Content-Type": "application/json", "If-Match": session.etag }, body: session.body,
    });
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data: response.ok ? data : null, reason: response.ok ? "" : data.error?.message?.slice(0, 200) || "" };
  };
  const put = async (etag, value) => finish(await begin(etag, value));
  const invalid = await put('"deliberately-invalid-synthetic-etag"', { content: "must never be written" });
  console.log(JSON.stringify({ invalidEtagStatus: invalid.status, reason: invalid.reason }));
  assert.ok([412, 500].includes(invalid.status), "A fabricated ETag must not be accepted.");
  assert.equal((await jsonRequest(metaUrl)).md5Checksum, metadataBefore.md5Checksum, "A rejected write must leave bytes unchanged.");
  const contenders = [{ ...original, content: "Synthetic contender A" }, { ...original, content: "Synthetic contender B" }];
  const sessions = await Promise.all(contenders.map(value => begin(metadataBefore.etag, value)));
  assert.ok(sessions.every(session => session.location), "Both sessions must start against the same original revision.");
  const raced = await Promise.all(sessions.map(finish));
  console.log(JSON.stringify({ concurrentStatuses: raced.map(result => result.status), reasons: raced.map(result => result.reason) }));
  assert.deepEqual(raced.map(result => result.status).sort(), [200, 412], "Exactly one concurrent writer must succeed.");
  const winner = raced.findIndex(result => result.status === 200);
  const confirmation = raced[winner].data;
  assert.ok(confirmation.etag && confirmation.version && confirmation.headRevisionId && confirmation.modifiedDate, "A successful upload must return the full revision confirmation required by the backend.");
  assert.equal(confirmation.id, created.id);
  const after = await jsonRequest(metaUrl);
  assert.deepEqual(await readRevision(after.headRevisionId), contenders[winner]);
  assert.deepEqual(await readRevision(metadataBefore.headRevisionId), original, "The old revision must retain its exact original content.");
  assert.equal((await put(metadataBefore.etag, { content: "stale write must fail" })).status, 412);
  assert.equal((await jsonRequest(metaUrl)).md5Checksum, after.md5Checksum);
  assert.deepEqual({ title: after.title, parents: after.parents, mimeType: after.mimeType, id: after.id }, {
    title: metadataBefore.title, parents: metadataBefore.parents, mimeType: metadataBefore.mimeType, id: metadataBefore.id,
  }, "Content updates must preserve file identity and location.");
  assert.ok(createdIds.has(created.id));
  const external = await request(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(created.id)}?uploadType=media`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...original, content: "Synthetic external edit" }),
  });
  assert.equal(external.status, 200);
  assert.equal((await put(after.etag, { content: "pre-external stale write must fail" })).status, 412);
  console.log(JSON.stringify({ result: "PASS", generatedIdDuplicateRejected: true, fabricatedEtagStatus: invalid.status, concurrentStatuses: raced.map(result => result.status), completeRevisionConfirmation: true, staleEtagRejected: true, priorRevisionPreserved: true, metadataPreserved: true, externalEditInvalidatesEtag: true, researchFilesAccessed: false, cleanup: "Synthetic artifacts retained; no deletes performed." }));
}

main().catch(error => {
  // Never dump auth response bodies, request headers or service configuration.
  console.error(error instanceof assert.AssertionError ? error.message : "Synthetic Drive contract check failed; no research files were targeted.");
  process.exitCode = 1;
});
