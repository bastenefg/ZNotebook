"use strict";

const express = require("express");
const multer = require("multer");
const { GoogleAuth, OAuth2Client } = require("google-auth-library");

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 250 * 1024 * 1024 } });

const PORT = process.env.PORT || 8080;
const DRIVE_FOLDER_ID = requiredEnv("DRIVE_FOLDER_ID");
const GOOGLE_CLIENT_ID = requiredEnv("GOOGLE_CLIENT_ID");
const CORS_ORIGIN = process.env.CORS_ORIGIN || "https://bastenefg.github.io";
const ALLOWED_EMAILS = parseList(process.env.ALLOWED_EMAILS).map((email) => email.toLowerCase());
const ALLOWED_DOMAIN = (process.env.ALLOWED_DOMAIN || "").trim().toLowerCase();
const DRIVE_OWNER_CLIENT_ID = process.env.DRIVE_OWNER_CLIENT_ID || "";
const DRIVE_OWNER_CLIENT_SECRET = process.env.DRIVE_OWNER_CLIENT_SECRET || "";
const DRIVE_OWNER_REFRESH_TOKEN = process.env.DRIVE_OWNER_REFRESH_TOKEN || "";
const RECORD_ID_REGISTRY_FILE_ID = (process.env.RECORD_ID_REGISTRY_FILE_ID || "").trim();

const DRIVE_CONFIG_NAME = "definitely-not-notion.config.json";
const DRIVE_RECORDS_FOLDER_NAME = "records";
const DRIVE_ASSETS_FOLDER_NAME = "assets";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const DRIVE_READ_CONCURRENCY = 6;
const RECORD_CACHE_MAX_BYTES = 32 * 1024 * 1024;
const RECORD_CACHE_MAX_ENTRIES = 1000;
const DRIVE_REVISION_FIELDS = "id,title,mimeType,parents,etag,version,headRevisionId,modifiedDate";

const driveAuthMode = driveOwnerOAuthConfigured() ? "storage-owner-oauth" : "service-account";
const googleAuth = driveAuthMode === "service-account" ? new GoogleAuth({ scopes: [DRIVE_SCOPE] }) : null;
const driveOwnerClient =
  driveAuthMode === "storage-owner-oauth"
    ? createDriveOwnerClient()
    : null;
const tokenVerifier = new OAuth2Client(GOOGLE_CLIENT_ID);

let workspaceCache = null;
let workspacePromise = null;
let workspaceInitQueue = Promise.resolve();
let driveAccessTokenPromise = null;
const recordCache = new Map();
const recordReads = new Map();
let recordCacheBytes = 0;

app.disable("x-powered-by");
app.use(express.json({ limit: "25mb" }));
app.use(corsHeaders);

app.options("*", (req, res) => res.status(204).end());

app.get("/health", (req, res) => {
  res.json({ ok: true, app: "znotebook-api", driveAuthMode, recordWriteProtocol: 2, recordRevisionFormat: 3, recordCreationConfigured: Boolean(RECORD_ID_REGISTRY_FILE_ID) });
});

app.use(requireAllowedUser);

app.get("/me", (req, res) => {
  res.json({ email: req.user.email, name: req.user.name || "" });
});

app.get("/workspace", async (req, res, next) => {
  try {
    const workspace = await ensureWorkspace();
    res.json(await readWorkspace(workspace));
  } catch (error) {
    next(error);
  }
});

app.post("/workspace/init", async (req, res, next) => {
  try {
    res.json(await initializeWorkspace(req.body?.taxonomy, req.body?.records));
  } catch (error) {
    next(error);
  }
});

app.put("/config", async (req, res, next) => {
  try {
    const workspace = await ensureWorkspace(req.body?.taxonomy);
    const updated = await driveUpdateJson(workspace.configFileId, {
      app: "INFUS Notebook",
      version: 1,
      updatedAt: new Date().toISOString(),
      taxonomy: req.body?.taxonomy || {},
    });
    res.json({ ok: true, modifiedTime: updated.modifiedTime || "" });
  } catch (error) {
    next(error);
  }
});

app.put("/records/:id", async (req, res, next) => {
  try {
    if (req.body?.writeProtocol !== 2 || typeof req.body?.baseRevision !== "string") {
      throw recordConflict("This browser must reconnect with the current app before saving. Your local draft is preserved.");
    }
    if (req.body?.force) throw recordConflict("Forced record overwrites are disabled. Recover a separate copy instead.");
    const record = req.body?.record;
    if (!record || record.id !== req.params.id) {
      res.status(400).json({ error: "Record ID mismatch." });
      return;
    }

    const workspace = await ensureWorkspace();
    const result = await upsertRecord(
      workspace.recordsFolderId,
      record,
      req.body.baseRevision,
      Boolean(req.body?.force),
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/records/:id/assets", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded." });
      return;
    }

    const workspace = await ensureWorkspace();
    const recordFolderId = await driveEnsureFolder(workspace.assetsFolderId, req.params.id);
    const safeName = `${Date.now()}-${req.file.originalname || "asset"}`;
    const file = await driveCreateBinary(
      recordFolderId,
      safeName,
      req.file.buffer,
      req.file.mimetype || "application/octet-stream",
    );

    res.json({
      id: file.id,
      name: file.name || safeName,
      mimeType: file.mimeType || req.file.mimetype || "application/octet-stream",
    });
  } catch (error) {
    next(error);
  }
});

app.get("/assets/:id", async (req, res, next) => {
  try {
    const response = await driveFetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
        req.params.id,
      )}?alt=media&supportsAllDrives=true`,
    );

    if (!response.ok) {
      throw await driveError(response);
    }

    res.setHeader("Content-Type", response.headers.get("content-type") || "application/octet-stream");
    res.setHeader("Cache-Control", "private, max-age=300");
    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const status = error.status || 500;
  const message = status >= 500 && !error.expose ? "Notebook backend error." : error.message;
  if (status >= 500) console.error(error);
  res.status(status).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`ZNotebook API listening on ${PORT}`);
});

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function parseList(value = "") {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function corsHeaders(req, res, next) {
  const origin = req.get("Origin") || "";
  const allowedOrigins = new Set([
    CORS_ORIGIN,
    "http://localhost:5173",
    "http://localhost:8000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8000",
  ]);

  if (allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  next();
}

async function requireAllowedUser(req, res, next) {
  try {
    const authHeader = req.get("Authorization") || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      res.status(401).json({ error: "Missing Google sign-in token." });
      return;
    }

    const ticket = await tokenVerifier.verifyIdToken({
      idToken: match[1],
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = String(payload.email || "").toLowerCase();

    if (!payload.email_verified || !isAllowedEmail(email)) {
      res.status(403).json({ error: "This Google account is not allowed to use this notebook." });
      return;
    }

    req.user = {
      email,
      name: payload.name || "",
    };
    next();
  } catch {
    res.status(401).json({ error: "Google sign-in expired. Please connect again." });
  }
}

function isAllowedEmail(email) {
  if (!email) return false;
  if (ALLOWED_EMAILS.includes(email)) return true;
  return Boolean(ALLOWED_DOMAIN && email.endsWith(`@${ALLOWED_DOMAIN}`));
}

async function ensureWorkspace(seedTaxonomy = null) {
  if (workspaceCache) return workspaceCache;
  if (workspacePromise) return workspacePromise;

  // Concurrent connections must share discovery, especially on a new workspace
  // where otherwise each request could create its own folders or config file.
  workspacePromise = (async () => {
    const discovery = await Promise.allSettled([
      driveEnsureFolder(DRIVE_FOLDER_ID, DRIVE_RECORDS_FOLDER_NAME),
      driveEnsureFolder(DRIVE_FOLDER_ID, DRIVE_ASSETS_FOLDER_NAME),
      driveFindChild(DRIVE_FOLDER_ID, DRIVE_CONFIG_NAME),
    ]);
    const failure = discovery.find((result) => result.status === "rejected");
    if (failure) throw failure.reason;
    const [recordsFolderId, assetsFolderId, existingConfig] = discovery.map((result) => result.value);
    const configFile = existingConfig || await driveCreateJson(DRIVE_FOLDER_ID, DRIVE_CONFIG_NAME, {
      app: "INFUS Notebook",
      version: 1,
      updatedAt: new Date().toISOString(),
      taxonomy: seedTaxonomy || {},
    });

    workspaceCache = { recordsFolderId, assetsFolderId, configFileId: configFile.id };
    return workspaceCache;
  })();
  try {
    return await workspacePromise;
  } finally {
    // A transient discovery error must not poison every subsequent connection.
    workspacePromise = null;
  }
}

function initializeWorkspace(taxonomy, seedRecords) {
  // Serialize the empty-workspace check and seeding within this server instance.
  const initialization = workspaceInitQueue.then(async () => {
    const workspace = await ensureWorkspace(taxonomy);
    const snapshot = await readWorkspace(workspace);
    if (!snapshot.records.length && Array.isArray(seedRecords)) {
      const records = seedRecords.filter((record) => record && record.id);
      if (records.length) {
        await mapWithConcurrency(records, DRIVE_READ_CONCURRENCY,
          (record) => upsertRecord(workspace.recordsFolderId, record));
        return readWorkspace(workspace);
      }
    }
    return snapshot;
  });
  workspaceInitQueue = initialization.catch(() => {});
  return initialization;
}

async function readWorkspace(workspace) {
  const [config, files] = await Promise.all([
    driveReadJson(workspace.configFileId),
    driveListChildren(workspace.recordsFolderId),
  ]);
  const recordFiles = files.filter((item) => item.name.endsWith(".json"));
  if (new Set(recordFiles.map((file) => file.name)).size !== recordFiles.length) {
    throw recordConflict("Duplicate record filenames exist on Drive. No records were changed; an administrator must review them.");
  }
  const contents = await mapWithConcurrency(recordFiles, DRIVE_READ_CONCURRENCY, readRecordFile);
  const records = [];
  const recordMeta = {};

  for (let index = 0; index < recordFiles.length; index += 1) {
    const file = recordFiles[index];
    const { record, meta } = contents[index];
    if (!record || !record.id) continue;
    if (Object.prototype.hasOwnProperty.call(recordMeta, record.id)) {
      throw recordConflict("More than one Drive file contains this record ID. No records were changed.");
    }
    records.push(record);
    Object.defineProperty(recordMeta, record.id, { value: meta, enumerable: true });
  }

  return {
    recordWriteProtocol: 2,
    taxonomy: config?.taxonomy || {},
    records,
    recordMeta,
  };
}

async function mapWithConcurrency(items, concurrency, map) {
  const results = new Array(items.length);
  let nextIndex = 0;
  let failed = false;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (!failed && nextIndex < items.length) {
      const index = nextIndex++;
      try {
        results[index] = await map(items[index], index);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  });
  await Promise.all(workers);
  return results;
}

async function readRecordFile(file) {
  // The folder is always listed first, so external edits are revalidated on
  // every sync. Version also detects edits that preserve modifiedTime.
  const version = file.version ? `v:${file.version}` : "";
  const cached = recordCache.get(file.id);
  if (version && cached?.version === version) {
    recordCache.delete(file.id);
    recordCache.set(file.id, cached);
    return cached.data;
  }

  const readKey = JSON.stringify([file.id, version]);
  if (recordReads.has(readKey)) return recordReads.get(readKey);
  const pending = (async () => {
    // A metadata listing and an unconstrained media GET can refer to different
    // revisions. Read this exact binary revision and return its paired token.
    const { data: record, metadata } = await driveReadVersionedJson(file.id);
    const data = { record, meta: recordMetadata(metadata) };
    const bytes = Buffer.byteLength(JSON.stringify(data) || "");
    invalidateRecordCache(file.id);
    if (version && bytes <= RECORD_CACHE_MAX_BYTES) {
      while (recordCache.size &&
        (recordCacheBytes + bytes > RECORD_CACHE_MAX_BYTES || recordCache.size >= RECORD_CACHE_MAX_ENTRIES)) {
        invalidateRecordCache(recordCache.keys().next().value);
      }
      recordCache.set(file.id, { version: `v:${metadata.version}`, data, bytes });
      recordCacheBytes += bytes;
    }
    return data;
  })();
  recordReads.set(readKey, pending);
  try {
    return await pending;
  } finally {
    recordReads.delete(readKey);
  }
}

function invalidateRecordCache(fileId) {
  const entry = recordCache.get(fileId);
  if (entry) recordCacheBytes -= entry.bytes;
  recordCache.delete(fileId);
}

function recordConflict(message = "Record changed on Drive since it was loaded. Your local draft is preserved.") {
  const error = new Error(message);
  error.status = 409;
  return error;
}

function recordMetadata(metadata) {
  if (!metadata?.id || !metadata.etag || !metadata.version || !metadata.headRevisionId ||
      !/^"[^"\r\n]+"$/.test(metadata.etag)) {
    const error = new Error("Drive did not provide a complete record revision. Saving is paused.");
    error.status = 502;
    throw error;
  }
  return {
    fileId: metadata.id,
    modifiedTime: metadata.modifiedDate || "",
    // Drive's numeric version can advance after a successful upload without
    // changing the content revision or ETag. It is useful for cache validation,
    // but including it in a write baseline creates false edit conflicts.
    revision: `d3.${Buffer.from(JSON.stringify([metadata.id, metadata.etag, metadata.headRevisionId])).toString("base64url")}`,
    // Only an exact legacy baseline may be migrated. Never infer safety from
    // the old ETag or timestamp alone when a pending d2 token no longer matches.
    legacyRevision: `d2.${Buffer.from(JSON.stringify([metadata.id, metadata.etag, String(metadata.version)])).toString("base64url")}`,
  };
}

async function driveReadVersionedJson(fileId) {
  const params = new URLSearchParams({ fields: DRIVE_REVISION_FIELDS, supportsAllDrives: "true" });
  const metadata = await driveRequest(`https://www.googleapis.com/drive/v2/files/${encodeURIComponent(fileId)}?${params}`);
  if (metadata.id !== fileId) throw recordConflict("Drive returned a different file identity. No save was attempted.");
  recordMetadata(metadata); // Fail closed before a live-content fallback could be used.
  const mediaParams = new URLSearchParams({ alt: "media", revisionId: metadata.headRevisionId, supportsAllDrives: "true" });
  const data = await driveRequest(`https://www.googleapis.com/drive/v2/files/${encodeURIComponent(fileId)}?${mediaParams}`);
  return { data, metadata };
}

async function upsertRecord(recordsFolderId, record, baseRevision = "", force = false) {
  if (force || typeof baseRevision !== "string") throw recordConflict("Forced or unversioned overwrites are disabled.");
  if (!record || typeof record.id !== "string" || !record.id || record.id.length > 512) {
    const error = new Error("A valid record ID is required.");
    error.status = 400;
    throw error;
  }
  const fileName = `${record.id}.json`;
  const existing = await driveFindChild(recordsFolderId, fileName);

  if (existing) {
    if (!baseRevision) throw recordConflict("This record already exists on Drive. Reconnect and review the local draft.");
    const current = await driveReadVersionedJson(existing.id);
    assertRecordLocation(current.metadata, recordsFolderId, fileName);
    const currentRevision = recordMetadata(current.metadata);
    if (baseRevision !== currentRevision.revision && baseRevision !== currentRevision.legacyRevision) throw recordConflict();
    if (current.data?.id !== record.id) throw recordConflict("The Drive file contains a different record ID. No changes were made.");
    const updated = await driveConditionalUpdateJson(existing.id, record, current.metadata);
    return { ok: true, ...recordMetadata(updated) };
  }

  if (baseRevision) throw recordConflict("The Drive record is missing or moved. It was not recreated; recover a separate copy instead.");
  const fileId = await reserveRecordFileId(record.id);
  try {
    await driveCreateJson(recordsFolderId, fileName, record, fileId);
  } catch (error) {
    if (error.status !== 409) throw error;
    // The winning create may have lost its response. Never PATCH on a retry.
  }
  const created = await driveReadVersionedJson(fileId);
  assertRecordLocation(created.metadata, recordsFolderId, fileName);
  if (!jsonEqual(created.data, record)) throw recordConflict("Another request created a different version of this record. Your draft is preserved.");
  return { ok: true, ...recordMetadata(created.metadata) };
}

function assertRecordLocation(metadata, recordsFolderId, fileName) {
  if (metadata.title !== fileName || !metadata.parents?.some((parent) => parent.id === recordsFolderId) || metadata.mimeType !== "application/json") {
    throw recordConflict("The record file moved or changed identity on Drive. No save was attempted.");
  }
}

function jsonEqual(left, right) {
  if (left === right) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object" || Array.isArray(left) !== Array.isArray(right)) return false;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every((key) => Object.prototype.hasOwnProperty.call(right, key) && jsonEqual(left[key], right[key]));
}

async function reserveRecordFileId(recordId) {
  if (!RECORD_ID_REGISTRY_FILE_ID) {
    const error = new Error("New record creation is paused until the administrator configures RECORD_ID_REGISTRY_FILE_ID. Your local draft is preserved.");
    error.status = 503;
    error.expose = true;
    throw error;
  }
  let generatedId;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { data, metadata } = await driveReadVersionedJson(RECORD_ID_REGISTRY_FILE_ID);
    if (metadata.mimeType !== "application/json" || data?.schema !== 1 || Object.keys(data).some((key) => !["schema", "records"].includes(key)) ||
        !data.records || typeof data.records !== "object" || Array.isArray(data.records) ||
        Object.values(data.records).some((value) => typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) ||
        new Set(Object.values(data.records)).size !== Object.keys(data.records).length) {
      throw new Error("The record ID registry is invalid. No record was created.");
    }
    if (Object.prototype.hasOwnProperty.call(data.records, recordId)) return data.records[recordId];
    if (!generatedId) {
      const generated = await driveRequest("https://www.googleapis.com/drive/v3/files/generateIds?count=1&space=drive&type=files");
      generatedId = generated.ids?.[0];
      if (typeof generatedId !== "string" || !/^[A-Za-z0-9_-]+$/.test(generatedId)) throw new Error("Drive did not reserve a valid file ID.");
    }
    const records = { ...data.records, [recordId]: generatedId };
    try {
      await driveConditionalUpdateJson(RECORD_ID_REGISTRY_FILE_ID, { schema: 1, records }, metadata);
      return generatedId;
    } catch (error) {
      if (!error.drivePreconditionFailed) throw error;
      // Retrying this metadata-only reservation is safe; record writes never
      // adopt a fresh baseline automatically after a conflict.
    }
  }
  const error = new Error("Record creation is busy. Retry after reconnecting; your draft is preserved.");
  error.status = 503;
  error.expose = true;
  throw error;
}

async function driveEnsureFolder(parentId, name) {
  const existing = await driveFindChild(parentId, name, FOLDER_MIME);
  if (existing) return existing.id;

  const created = await driveRequest("https://www.googleapis.com/drive/v3/files?supportsAllDrives=true", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: FOLDER_MIME,
      parents: [parentId],
    }),
  });
  return created.id;
}

async function driveFindChild(parentId, name, mimeType = "") {
  const filters = [`'${parentId}' in parents`, `name = '${driveEscapeQuery(name)}'`, "trashed = false"];
  if (mimeType) filters.push(`mimeType = '${driveEscapeQuery(mimeType)}'`);
  const params = new URLSearchParams({
    q: filters.join(" and "),
    fields: "nextPageToken,files(id,name,mimeType,modifiedTime,version)",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
    pageSize: "2",
  });
  let found;
  const seenPages = new Set();
  do {
    const result = await driveRequest(`https://www.googleapis.com/drive/v3/files?${params}`);
    for (const file of result.files || []) {
      if (found) throw recordConflict("Duplicate filenames exist on Drive. No file was selected or overwritten.");
      found = file;
    }
    if (!result.nextPageToken) return found;
    if (seenPages.has(result.nextPageToken)) throw new Error("Drive repeated a file lookup page.");
    seenPages.add(result.nextPageToken);
    params.set("pageToken", result.nextPageToken);
  } while (true);
}

async function driveListChildren(parentId) {
  const params = new URLSearchParams({
    q: `'${parentId}' in parents and trashed = false`,
    fields: "nextPageToken,files(id,name,mimeType,modifiedTime,version)",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
    pageSize: "1000",
  });
  const files = [];
  let nextPageToken;
  do {
    if (nextPageToken) params.set("pageToken", nextPageToken);
    const result = await driveRequest(`https://www.googleapis.com/drive/v3/files?${params}`);
    files.push(...(result.files || []));
    nextPageToken = result.nextPageToken;
  } while (nextPageToken);
  return files;
}

async function driveReadJson(fileId) {
  return driveRequest(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      fileId,
    )}?alt=media&supportsAllDrives=true`,
  );
}

async function driveCreateJson(parentId, name, data, fileId = "") {
  const boundary = `znotebook_${Date.now()}`;
  const metadata = JSON.stringify({
    ...(fileId ? { id: fileId } : {}),
    name,
    mimeType: "application/json",
    parents: [parentId],
  });
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
    ),
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
        data,
        null,
        2,
      )}\r\n`,
    ),
    Buffer.from(`--${boundary}--\r\n`),
  ]);

  return driveRequest(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType,modifiedTime",
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    },
  );
}

async function driveConditionalUpdateJson(fileId, data, metadata) {
  recordMetadata(metadata);
  if (metadata.id !== fileId) throw recordConflict("The save revision belongs to another file.");
  const body = Buffer.from(JSON.stringify(data, null, 2));
  const params = new URLSearchParams({
    uploadType: "resumable", newRevision: "true", supportsAllDrives: "true", fields: DRIVE_REVISION_FIELDS,
  });
  invalidateRecordCache(fileId);
  try {
    const initiation = await driveFetch(`https://www.googleapis.com/upload/drive/v2/files/${encodeURIComponent(fileId)}?${params}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "If-Match": metadata.etag,
        "X-Upload-Content-Type": "application/json",
        "X-Upload-Content-Length": String(body.length),
      },
      body: "{}",
    });
    if (!initiation.ok) throw await conditionalWriteError(initiation);
    const location = initiation.headers.get("location");
    let uploadUrl;
    try { uploadUrl = new URL(location); } catch { throw new Error("Drive did not return a valid upload session."); }
    if (uploadUrl.origin !== "https://www.googleapis.com" || uploadUrl.username || uploadUrl.password ||
        !uploadUrl.pathname.startsWith("/upload/drive/") || uploadUrl.hash) {
      throw new Error("Drive returned an unexpected upload destination. No content was sent.");
    }
    const response = await driveFetch(uploadUrl.href, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Content-Length": String(body.length), "If-Match": metadata.etag },
      body,
    });
    if (!response.ok) throw await conditionalWriteError(response);
    const updated = await response.json();
    recordMetadata(updated);
    if (updated.id !== fileId || updated.version === metadata.version || updated.etag === metadata.etag) {
      throw new Error("Drive did not confirm a new revision. Reconnect before retrying.");
    }
    return updated;
  } finally {
    invalidateRecordCache(fileId);
  }
}

async function conditionalWriteError(response) {
  if (response.status === 412) {
    const error = recordConflict();
    error.drivePreconditionFailed = true;
    return error;
  }
  return driveError(response);
}

async function driveCreateBinary(parentId, name, buffer, mimeType) {
  const boundary = `znotebook_${Date.now()}`;
  const metadata = JSON.stringify({
    name,
    mimeType,
    parents: [parentId],
  });
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
    ),
    Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    buffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  return driveRequest(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType,modifiedTime",
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    },
  );
}

async function driveUpdateJson(fileId, data) {
  const params = new URLSearchParams({
    uploadType: "media",
    supportsAllDrives: "true",
    fields: "id,name,mimeType,modifiedTime",
  });
  invalidateRecordCache(fileId);
  try {
    return await driveRequest(
      `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?${params}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data, null, 2),
      },
    );
  } finally {
    invalidateRecordCache(fileId);
  }
}

async function driveRequest(url, options = {}) {
  const response = await driveFetch(url, options);
  if (!response.ok) throw await driveError(response);
  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json();
  return response.text();
}

async function driveFetch(url, options = {}) {
  const token = await getDriveAccessToken();
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

async function getDriveAccessToken() {
  if (driveAccessTokenPromise) return driveAccessTokenPromise;
  driveAccessTokenPromise = acquireDriveAccessToken();
  try {
    return await driveAccessTokenPromise;
  } finally {
    driveAccessTokenPromise = null;
  }
}

async function acquireDriveAccessToken() {
  try {
    const client =
      driveAuthMode === "storage-owner-oauth"
        ? driveOwnerClient
        : await googleAuth.getClient();
    const accessToken = await client.getAccessToken();
    return typeof accessToken === "string" ? accessToken : accessToken.token;
  } catch (error) {
    throw normalizeDriveAuthError(error);
  }
}

function normalizeDriveAuthError(error) {
  const raw = [
    error?.message,
    error?.response?.data?.error,
    error?.response?.data?.error_description,
  ]
    .filter(Boolean)
    .join(" ");

  if (raw.includes("invalid_grant")) {
    const friendly = new Error(
      "Drive owner authorization expired or was revoked. Regenerate DRIVE_OWNER_REFRESH_TOKEN and redeploy Cloud Run. If the OAuth app is still in Testing, set its publishing status to In production first.",
    );
    friendly.status = 503;
    friendly.expose = true;
    friendly.cause = error;
    return friendly;
  }

  return error;
}

function driveOwnerOAuthConfigured() {
  const values = [DRIVE_OWNER_CLIENT_ID, DRIVE_OWNER_CLIENT_SECRET, DRIVE_OWNER_REFRESH_TOKEN];
  const provided = values.filter(Boolean).length;
  if (provided > 0 && provided < values.length) {
    throw new Error(
      "Set DRIVE_OWNER_CLIENT_ID, DRIVE_OWNER_CLIENT_SECRET, and DRIVE_OWNER_REFRESH_TOKEN together.",
    );
  }
  return provided === values.length;
}

function createDriveOwnerClient() {
  const client = new OAuth2Client(DRIVE_OWNER_CLIENT_ID, DRIVE_OWNER_CLIENT_SECRET);
  client.setCredentials({ refresh_token: DRIVE_OWNER_REFRESH_TOKEN });
  return client;
}

async function driveError(response) {
  const text = await response.text();
  const error = new Error(text || `Google Drive request failed with ${response.status}`);
  error.status = response.status === 409 ? 409 : response.status >= 500 ? 502 : response.status;
  return error;
}

function driveEscapeQuery(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}
