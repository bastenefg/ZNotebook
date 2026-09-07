"use strict";

const assert = require("node:assert/strict");
const { performance } = require("node:perf_hooks");
const { setTimeout: delay } = require("node:timers/promises");
const { createServer } = require("../test/helpers/server");

async function main() {
  const { server } = createServer();
  const latencyMs = 25;
  const files = Array.from({ length: 24 }, (_, index) => ({
    id: `file-${index}`, name: `${index}.json`, version: "1", modifiedTime: `time-${index}`,
  }));
  const workspace = { recordsFolderId: "records", configFileId: "config" };
  let downloads = 0;
  server.driveReadJson = async (id) => {
    await delay(latencyMs);
    if (id === "config") return { taxonomy: { category: ["Demo"] } };
    downloads += 1;
    return { id, title: `Synthetic ${id}` };
  };
  server.driveListChildren = async () => { await delay(latencyMs); return files; };

  // Mirrors the original readWorkspace path: config, listing, then serial bodies.
  async function originalSerialRead() {
    const config = await server.driveReadJson(workspace.configFileId);
    const recordFiles = await server.driveListChildren(workspace.recordsFolderId);
    const records = [];
    const recordMeta = {};
    for (const file of recordFiles) {
      const record = await server.driveReadJson(file.id);
      records.push(record);
      recordMeta[record.id] = { fileId: file.id, modifiedTime: file.modifiedTime };
    }
    return { taxonomy: config.taxonomy, records, recordMeta };
  }

  const results = [];
  let baseline;
  for (const [label, run] of [
    ["Before (serial)", originalSerialRead],
    ["After (cold cache)", () => server.readWorkspace(workspace)],
    ["After (warm cache)", () => server.readWorkspace(workspace)],
  ]) {
    downloads = 0;
    const start = performance.now();
    const snapshot = JSON.parse(JSON.stringify(await run()));
    const durationMs = Math.round(performance.now() - start);
    if (!baseline) baseline = snapshot;
    assert.deepEqual(snapshot, baseline);
    results.push({ path: label, durationMs, recordDownloads: downloads, records: snapshot.records.length });
  }
  console.log("Synthetic local benchmark: 24 fake records, 25 ms per mocked Drive request. No live network/data.");
  console.table(results);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
