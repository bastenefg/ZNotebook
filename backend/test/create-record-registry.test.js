"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createRecordRegistry } = require("../tools/create-record-registry");

test("registry setup only generates a fresh ID and creates a new empty registry", async () => {
  const calls = [];
  const result = await createRecordRegistry({ folderId: "existing-research-root", fetchDrive: async (url, options = {}) => {
    calls.push({ url, options });
    if (url.includes("generateIds")) return { ids: ["brand-new-registry-id"] };
    assert.equal(options.method, "POST");
    const metadata = JSON.parse(options.body.split("\r\n\r\n")[1].split("\r\n--")[0]);
    const data = JSON.parse(options.body.split("\r\n\r\n")[2].split("\r\n--")[0]);
    assert.deepEqual(data, { schema: 1, records: {} });
    assert.equal(metadata.id, "brand-new-registry-id");
    assert.deepEqual(metadata.parents, ["existing-research-root"]);
    return metadata;
  } });
  assert.equal(result.fileId, "brand-new-registry-id");
  assert.equal(calls.length, 2);
  assert.ok(calls.every(({ options }) => ["GET", "POST"].includes(options.method || "GET")));
  assert.ok(calls.every(({ url }) => !url.includes("/files/existing-research-root")));
});

test("registry setup refuses invalid destination and does not retry a failed creation", async () => {
  let calls = 0;
  await assert.rejects(createRecordRegistry({ folderId: "../bad", fetchDrive: () => { calls++; } }));
  assert.equal(calls, 0);
  await assert.rejects(createRecordRegistry({ folderId: "root", fetchDrive: async url => {
    calls++;
    if (url.includes("generateIds")) return { ids: ["new-id"] };
    throw new Error("Synthetic response lost");
  } }), /Synthetic response lost/);
  assert.equal(calls, 2);
});
