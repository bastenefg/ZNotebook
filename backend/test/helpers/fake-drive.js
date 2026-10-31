"use strict";

const assert = require("node:assert/strict");

const clone = (value) => JSON.parse(JSON.stringify(value));
const folderMime = "application/vnd.google-apps.folder";

function response(status, data, extraHeaders = {}) {
  const headers = { "content-type": "application/json", ...extraHeaders };
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[name.toLowerCase()] || null },
    json: async () => clone(data),
    text: async () => JSON.stringify(data),
  };
}

function rendezvous(expected, filter = () => true) {
  let count = 0;
  let release;
  let reject;
  const ready = new Promise((resolve, fail) => { release = resolve; reject = fail; });
  const timer = setTimeout(() => reject(new Error(`Only ${count}/${expected} independent requests reached the write barrier`)), 3000);
  ready.finally(() => clearTimeout(timer)).catch(() => {});
  return async (event) => {
    if (!filter(event)) return;
    count += 1;
    if (count >= expected) release();
    await ready;
  };
}

// This fake models Drive's storage boundary, not a server mutex. Separate server
// VM instances share it. Every final upload performs its own atomic If-Match
// comparison, after any test gate, immediately before replacing bytes.
function createFakeDrive({ registry = true, records = [] } = {}) {
  const files = new Map();
  const sessions = new Map();
  const requests = [];
  const commits = [];
  const hooks = {};
  let nextId = 0;
  let nextSession = 0;

  function addFile(id, name, parent, data, mimeType = "application/json", extra = {}) {
    const metadata = {
      id, title: name, mimeType, parents: parent ? [{ id: parent }] : [],
      etag: `"${id}-1"`, version: "1", headRevisionId: `${id}-revision-1`,
      modifiedDate: "2026-01-01T00:00:01.000Z", ...clone(extra),
    };
    const body = clone(data);
    files.set(id, { metadata, data: body, history: new Map([[metadata.headRevisionId, clone(body)]]) });
    return id;
  }

  function replace(file, data) {
    const version = Number(file.metadata.version) + 1;
    file.metadata = { ...file.metadata, version: String(version), etag: `"${file.metadata.id}-${version}"`,
      headRevisionId: `${file.metadata.id}-revision-${version}`, modifiedDate: `2026-01-01T00:00:${String(version).padStart(2, "0")}.000Z` };
    file.data = clone(data);
    file.history.set(file.metadata.headRevisionId, clone(data));
    return clone(file.metadata);
  }

  function v3(file) {
    return { ...clone(file.metadata), name: file.metadata.title, modifiedTime: file.metadata.modifiedDate,
      parents: file.metadata.parents.map((parent) => parent.id) };
  }

  addFile("root", "Notebook", null, {}, folderMime);
  addFile("records", "records", "root", {}, folderMime);
  addFile("assets", "assets", "root", {}, folderMime);
  addFile("config", "definitely-not-notion.config.json", "root", { taxonomy: { sections: [{ id: "experiments", name: "Synthetic research" }] } });
  if (registry) addFile("registry", "record-id-registry.json", "root", { schema: 1, records: {} });
  for (const { fileId, record, metadata = {} } of records) addFile(fileId, `${record.id}.json`, "records", record, "application/json", metadata);

  async function fetch(owner, url, options = {}) {
    const parsed = new URL(url);
    assert.equal(parsed.origin, "https://www.googleapis.com", "fake Drive rejects all real or unexpected network hosts");
    const method = options.method || "GET";
    const headers = Object.fromEntries(Object.entries(options.headers || {}).map(([key, value]) => [key.toLowerCase(), value]));
    assert.equal(headers.authorization, "Bearer fake-token");
    const call = { owner, url: String(url), path: parsed.pathname, method, headers, body: options.body };
    requests.push(call);
    if (hooks.beforeRequest) {
      const intercepted = await hooks.beforeRequest(call);
      if (intercepted) return intercepted;
    }

    const uploadId = parsed.searchParams.get("upload_id");
    if (uploadId) {
      assert.equal(method, "PUT");
      const session = sessions.get(uploadId);
      assert.ok(session, "upload session exists");
      const event = { kind: "update", owner, fileId: session.fileId, sessionId: uploadId, call };
      if (hooks.beforeCommit) await hooks.beforeCommit(event);
      const file = files.get(session.fileId);
      if (!file) return response(404, { error: { message: "File missing" } });
      // A header on session initiation alone does not satisfy this check. Tests
      // deliberately interleave two successful initiations before either commit.
      if (headers["if-match"] && headers["if-match"] !== file.metadata.etag) {
        return response(412, { error: { message: "Precondition failed" } });
      }
      const metadata = replace(file, JSON.parse(Buffer.isBuffer(options.body) ? options.body.toString("utf8") : options.body));
      commits.push({ ...event, data: clone(file.data), metadata });
      if (hooks.afterCommit) await hooks.afterCommit(event);
      return response(200, metadata);
    }

    if (parsed.pathname.startsWith("/upload/drive/v2/files/") && parsed.searchParams.get("uploadType") === "resumable") {
      assert.equal(method, "PUT");
      const fileId = decodeURIComponent(parsed.pathname.split("/").at(-1));
      const file = files.get(fileId);
      if (!file) return response(404, { error: { message: "File missing" } });
      if (headers["if-match"] && headers["if-match"] !== file.metadata.etag) return response(412, { error: { message: "Precondition failed" } });
      const id = `session-${++nextSession}`;
      sessions.set(id, { fileId, owner, initialEtag: headers["if-match"] });
      const location = `https://www.googleapis.com/upload/drive/v2/files/${encodeURIComponent(fileId)}?uploadType=resumable&upload_id=${id}`;
      if (hooks.afterInitiation) await hooks.afterInitiation({ owner, fileId, sessionId: id, call });
      return response(200, {}, { location });
    }

    if (parsed.pathname === "/drive/v3/files/generateIds") {
      assert.equal(method, "GET");
      return response(200, { ids: [`reserved-file-${++nextId}`] });
    }

    if (parsed.pathname === "/drive/v3/files" && method === "GET") {
      const query = parsed.searchParams.get("q") || "";
      const parent = query.match(/'([^']+)' in parents/)?.[1];
      const name = query.match(/name = '((?:\\.|[^'])*)'/)?.[1]?.replace(/\\(['\\])/g, "$1");
      const mime = query.match(/mimeType = '([^']+)'/)?.[1];
      const result = [...files.values()].filter((file) => (!parent || file.metadata.parents.some((item) => item.id === parent)) &&
        (name === undefined || file.metadata.title === name) && (!mime || file.metadata.mimeType === mime)).map(v3);
      return response(200, { files: result });
    }

    const fileMatch = parsed.pathname.match(/^\/drive\/v[23]\/files\/([^/]+)$/);
    if (fileMatch && method === "GET") {
      const id = decodeURIComponent(fileMatch[1]);
      const file = files.get(id);
      if (!file) return response(404, { error: { message: "File missing" } });
      if (parsed.searchParams.get("alt") === "media") {
        const revision = parsed.searchParams.get("revisionId");
        const data = revision ? file.history.get(revision) : file.data;
        if (!data) return response(404, { error: { message: "Revision missing" } });
        if (hooks.beforeMediaRead) await hooks.beforeMediaRead({ owner, fileId: id, revision, call });
        return response(200, clone(data));
      }
      const metadata = parsed.pathname.includes("/v2/") ? clone(file.metadata) : v3(file);
      if (hooks.afterMetadataRead) await hooks.afterMetadataRead({ owner, fileId: id, metadata, call });
      return response(200, metadata);
    }

    if (parsed.pathname === "/upload/drive/v3/files" && method === "POST" && parsed.searchParams.get("uploadType") === "multipart") {
      const boundary = headers["content-type"].match(/boundary=(.*)$/)?.[1];
      assert.ok(boundary);
      const parts = options.body.toString("utf8").split(`--${boundary}`).filter((part) => part.includes("\r\n\r\n"));
      const payloads = parts.map((part) => JSON.parse(part.slice(part.indexOf("\r\n\r\n") + 4).trim()));
      assert.equal(payloads.length, 2);
      const [metadata, data] = payloads;
      const id = metadata.id || `unreserved-file-${++nextId}`;
      const event = { kind: "create", owner, fileId: id, call };
      if (hooks.beforeCommit) await hooks.beforeCommit(event);
      if (files.has(id)) return response(409, { error: { message: "File ID already exists" } });
      addFile(id, metadata.name, metadata.parents[0], data, metadata.mimeType);
      commits.push({ ...event, data: clone(data), metadata: clone(files.get(id).metadata) });
      if (hooks.afterCommit) await hooks.afterCommit(event);
      return response(200, v3(files.get(id)));
    }
    throw new Error(`Unexpected fake Drive request: ${method} ${parsed.pathname}`);
  }

  return { files, requests, sessions, commits, hooks, addFile,
    fetchFor: (owner) => (url, options) => fetch(owner, url, options),
    snapshot: () => [...files].map(([id, file]) => ({ id, metadata: clone(file.metadata), data: clone(file.data) })),
    externalUpdate: (id, data) => replace(files.get(id), data),
  };
}

module.exports = { createFakeDrive, rendezvous, clone, response };
