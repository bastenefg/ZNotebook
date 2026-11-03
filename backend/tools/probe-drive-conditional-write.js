"use strict";

// Opt-in integration contract check. Creates NEW synthetic files in a NEW root
// folder, never accepts an existing destination/file ID, and never deletes files.
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { OAuth2Client } = require("google-auth-library");

async function main() {
  assert.ok(process.argv.includes("--allow-create-isolated-test-data"), "Explicit isolated-test opt-in is required.");
  const sequentialOnly = process.argv.includes("--sequential-only");
  const auth = new OAuth2Client(process.env.DRIVE_OWNER_CLIENT_ID, process.env.DRIVE_OWNER_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: process.env.DRIVE_OWNER_REFRESH_TOKEN });
  const access = await auth.getAccessToken();
  const token = typeof access === "string" ? access : access.token;
  const createdIds = new Set();
  const request = async (url, options = {}) => fetch(url, {
    ...options, signal: AbortSignal.timeout(30000), headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
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
  // Use the exact field projection and request parameters used by server.js.
  // A save confirmation is the next client's baseline, so it must compare
  // identically to the metadata returned by the following protected save.
  const revisionFields = "id,title,mimeType,parents,etag,version,headRevisionId,modifiedDate";
  const metaParams = new URLSearchParams({ fields: revisionFields, supportsAllDrives: "true" });
  const metaUrl = `https://www.googleapis.com/drive/v2/files/${encodeURIComponent(created.id)}?${metaParams}`;
  const checksumUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(created.id)}?fields=md5Checksum&supportsAllDrives=true`;
  const checksum = async () => (await jsonRequest(checksumUrl)).md5Checksum;
  let metadataVersionDriftObserved = false;
  const revisionIdentity = value => Object.fromEntries(["id", "etag", "headRevisionId", "modifiedDate"].map(key => [key, value[key]]));
  const confirmStableRevision = async (confirmation, label) => {
    const observed = await jsonRequest(metaUrl);
    assert.deepEqual(revisionIdentity(confirmation), revisionIdentity(observed), `${label}: uploaded content identity must match the next server metadata GET exactly.`);
    if (String(confirmation.version) !== String(observed.version)) metadataVersionDriftObserved = true;
    return observed;
  };
  const metadataBefore = await jsonRequest(metaUrl);
  const checksumBefore = await checksum();
  assert.ok(metadataBefore.etag && metadataBefore.headRevisionId, "The synthetic binary file must expose an ETag and a head revision.");
  const readRevision = (revision) => jsonRequest(`https://www.googleapis.com/drive/v2/files/${encodeURIComponent(created.id)}?alt=media&revisionId=${encodeURIComponent(revision)}&supportsAllDrives=true`);
  assert.deepEqual(await readRevision(metadataBefore.headRevisionId), original);
  if (!sequentialOnly) {
    const duplicate = await request(createUrl, { ...createOptions, body: createOptions.body.replace(JSON.stringify(original), JSON.stringify({ ...original, content: "Duplicate ID must not replace original" })) });
    assert.equal(duplicate.status, 409, "Repeated creation of the same generated ID must fail without overwriting.");
    assert.equal(await checksum(), checksumBefore);
  }
  const begin = async (etag, value) => {
    assert.ok(createdIds.has(created.id), "Only a file created by this process may be modified.");
    const body = JSON.stringify(value);
    const params = new URLSearchParams({ uploadType: "resumable", newRevision: "true", supportsAllDrives: "true", fields: revisionFields });
    const response = await request(`https://www.googleapis.com/upload/drive/v2/files/${encodeURIComponent(created.id)}?${params}`, {
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
  let invalid = null;
  if (!sequentialOnly) {
    invalid = await put('"deliberately-invalid-synthetic-etag"', { content: "must never be written" });
    console.log(JSON.stringify({ invalidEtagStatus: invalid.status, reason: invalid.reason }));
    assert.ok([412, 500].includes(invalid.status), "A fabricated ETag must not be accepted.");
    assert.equal(await checksum(), checksumBefore, "A rejected write must leave bytes unchanged.");
  }
  const contenders = [{ ...original, content: "Synthetic contender A" }, { ...original, content: "Synthetic contender B" }];
  let raced;
  if (sequentialOnly) {
    raced = [await put(metadataBefore.etag, contenders[0])];
    assert.equal(raced[0].status, 200, "The initial synthetic upload must succeed.");
    console.log(JSON.stringify({ initialUploadStatus: raced[0].status, mode: "sequential-only" }));
  } else {
    const sessions = await Promise.all(contenders.map(value => begin(metadataBefore.etag, value)));
    assert.ok(sessions.every(session => session.location), "Both sessions must start against the same original revision.");
    raced = await Promise.all(sessions.map(finish));
    console.log(JSON.stringify({ concurrentStatuses: raced.map(result => result.status), reasons: raced.map(result => result.reason) }));
    assert.deepEqual(raced.map(result => result.status).sort(), [200, 412], "Exactly one concurrent writer must succeed.");
  }
  const winner = raced.findIndex(result => result.status === 200);
  const confirmation = raced[winner].data;
  assert.ok(confirmation.etag && confirmation.version && confirmation.headRevisionId && confirmation.modifiedDate, "A successful upload must return the full revision confirmation required by the backend.");
  assert.equal(confirmation.id, created.id);
  const after = await confirmStableRevision(confirmation, "Initial upload");
  const checksumAfter = await checksum();
  assert.deepEqual(await readRevision(after.headRevisionId), contenders[winner]);
  assert.deepEqual(await readRevision(metadataBefore.headRevisionId), original, "The old revision must retain its exact original content.");
  assert.equal((await put(metadataBefore.etag, { content: "stale write must fail" })).status, 412);
  assert.equal(await checksum(), checksumAfter);
  assert.deepEqual({ title: after.title, parents: after.parents, mimeType: after.mimeType, id: after.id }, {
    title: metadataBefore.title, parents: metadataBefore.parents, mimeType: metadataBefore.mimeType, id: metadataBefore.id,
  }, "Content updates must preserve file identity and location.");
  // Reproduce rapid consecutive phone saves using the server's returned token,
  // then a later save after Drive has had time to finish any metadata work.
  let latestConfirmation = confirmation;
  for (let index = 1; index <= 2; index += 1) {
    const value = { ...original, content: `Synthetic sequential save ${index}` };
    const saved = await put(latestConfirmation.etag, value);
    assert.equal(saved.status, 200, `Sequential save ${index} must accept the preceding upload confirmation.`);
    await confirmStableRevision(saved.data, `Sequential save ${index}`);
    assert.deepEqual(await readRevision(saved.data.headRevisionId), value);
    latestConfirmation = saved.data;
    console.log(JSON.stringify({ sequentialSave: index, status: saved.status }));
  }
  await new Promise(resolve => setTimeout(resolve, 10000));
  await confirmStableRevision(latestConfirmation, "Delayed metadata check");
  const delayedValue = { ...original, content: "Synthetic save after delayed metadata check" };
  const delayedSave = await put(latestConfirmation.etag, delayedValue);
  assert.equal(delayedSave.status, 200, "A delayed save must accept the preceding upload confirmation.");
  await confirmStableRevision(delayedSave.data, "Delayed save");
  assert.deepEqual(await readRevision(delayedSave.data.headRevisionId), delayedValue);
  assert.ok(createdIds.has(created.id));
  const external = await request(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(created.id)}?uploadType=media`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...original, content: "Synthetic external edit" }),
  });
  assert.equal(external.status, 200);
  assert.equal((await put(delayedSave.data.etag, { content: "pre-external stale write must fail" })).status, 412);
  console.log(JSON.stringify({ result: "PASS", mode: sequentialOnly ? "sequential-only" : "full", generatedIdDuplicateRejected: sequentialOnly ? null : true, fabricatedEtagStatus: invalid?.status ?? null, concurrentStatuses: sequentialOnly ? null : raced.map(result => result.status), completeRevisionConfirmation: true, responseContentRevisionMatchesMetadata: true, metadataVersionDriftObserved, sequentialSaves: 2, delayedRevisionStable: true, delayedSaveAccepted: true, staleEtagRejected: true, priorRevisionPreserved: true, metadataPreserved: true, externalEditInvalidatesEtag: true, researchFilesAccessed: false, cleanup: "Synthetic artifacts retained; no deletes performed." }));
}

main().catch(error => {
  // Never dump auth response bodies, request headers or service configuration.
  console.error(error instanceof assert.AssertionError ? error.message : "Synthetic Drive contract check failed; no research files were targeted.");
  process.exitCode = 1;
});
