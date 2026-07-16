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

const DRIVE_CONFIG_NAME = "definitely-not-notion.config.json";
const DRIVE_RECORDS_FOLDER_NAME = "records";
const DRIVE_ASSETS_FOLDER_NAME = "assets";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

const driveAuthMode = driveOwnerOAuthConfigured() ? "storage-owner-oauth" : "service-account";
const googleAuth = driveAuthMode === "service-account" ? new GoogleAuth({ scopes: [DRIVE_SCOPE] }) : null;
const driveOwnerClient =
  driveAuthMode === "storage-owner-oauth"
    ? createDriveOwnerClient()
    : null;
const tokenVerifier = new OAuth2Client(GOOGLE_CLIENT_ID);

let workspaceCache = null;

app.disable("x-powered-by");
app.use(express.json({ limit: "25mb" }));
app.use(corsHeaders);

app.options("*", (req, res) => res.status(204).end());

app.get("/health", (req, res) => {
  res.json({ ok: true, app: "znotebook-api", driveAuthMode });
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
    const workspace = await ensureWorkspace(req.body?.taxonomy);
    const snapshot = await readWorkspace(workspace);

    if (!snapshot.records.length && Array.isArray(req.body?.records)) {
      const records = req.body.records.filter((record) => record && record.id);
      await Promise.all(records.map((record) => upsertRecord(workspace.recordsFolderId, record)));
      res.json(await readWorkspace(workspace));
      return;
    }

    res.json(snapshot);
  } catch (error) {
    next(error);
  }
});

app.put("/config", async (req, res, next) => {
  try {
    const workspace = await ensureWorkspace(req.body?.taxonomy);
    const updated = await driveUpdateJson(workspace.configFileId, {
      app: "Definitely not Notion",
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
    const record = req.body?.record;
    if (!record || record.id !== req.params.id) {
      res.status(400).json({ error: "Record ID mismatch." });
      return;
    }

    const workspace = await ensureWorkspace();
    const result = await upsertRecord(
      workspace.recordsFolderId,
      record,
      req.body?.lastKnownModifiedTime || "",
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
  const message = status >= 500 ? "Notebook backend error." : error.message;
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

  const recordsFolderId = await driveEnsureFolder(DRIVE_FOLDER_ID, DRIVE_RECORDS_FOLDER_NAME);
  const assetsFolderId = await driveEnsureFolder(DRIVE_FOLDER_ID, DRIVE_ASSETS_FOLDER_NAME);
  let configFile = await driveFindChild(DRIVE_FOLDER_ID, DRIVE_CONFIG_NAME);

  if (!configFile) {
    configFile = await driveCreateJson(DRIVE_FOLDER_ID, DRIVE_CONFIG_NAME, {
      app: "Definitely not Notion",
      version: 1,
      updatedAt: new Date().toISOString(),
      taxonomy: seedTaxonomy || {},
    });
  }

  workspaceCache = {
    recordsFolderId,
    assetsFolderId,
    configFileId: configFile.id,
  };
  return workspaceCache;
}

async function readWorkspace(workspace) {
  const config = await driveReadJson(workspace.configFileId);
  const files = await driveListChildren(workspace.recordsFolderId);
  const records = [];
  const recordMeta = {};

  for (const file of files.filter((item) => item.name.endsWith(".json"))) {
    const record = await driveReadJson(file.id);
    if (!record || !record.id) continue;
    records.push(record);
    recordMeta[record.id] = {
      fileId: file.id,
      modifiedTime: file.modifiedTime || "",
    };
  }

  return {
    taxonomy: config?.taxonomy || {},
    records,
    recordMeta,
  };
}

async function upsertRecord(recordsFolderId, record, lastKnownModifiedTime = "", force = false) {
  const fileName = `${record.id}.json`;
  const existing = await driveFindChild(recordsFolderId, fileName);

  if (existing) {
    if (
      !force &&
      lastKnownModifiedTime &&
      existing.modifiedTime &&
      existing.modifiedTime !== lastKnownModifiedTime
    ) {
      const error = new Error("Record changed on Drive since it was loaded.");
      error.status = 409;
      throw error;
    }

    const updated = await driveUpdateJson(existing.id, record);
    return { ok: true, fileId: existing.id, modifiedTime: updated.modifiedTime || "" };
  }

  const created = await driveCreateJson(recordsFolderId, fileName, record);
  return { ok: true, fileId: created.id, modifiedTime: created.modifiedTime || "" };
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
    fields: "files(id,name,mimeType,modifiedTime)",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });
  const result = await driveRequest(`https://www.googleapis.com/drive/v3/files?${params}`);
  return result.files && result.files[0];
}

async function driveListChildren(parentId) {
  const params = new URLSearchParams({
    q: `'${parentId}' in parents and trashed = false`,
    fields: "files(id,name,mimeType,modifiedTime)",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
    pageSize: "1000",
  });
  const result = await driveRequest(`https://www.googleapis.com/drive/v3/files?${params}`);
  return result.files || [];
}

async function driveReadJson(fileId) {
  return driveRequest(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      fileId,
    )}?alt=media&supportsAllDrives=true`,
  );
}

async function driveCreateJson(parentId, name, data) {
  const boundary = `znotebook_${Date.now()}`;
  const metadata = JSON.stringify({
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
  return driveRequest(
    `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?${params}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data, null, 2),
    },
  );
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
  const client =
    driveAuthMode === "storage-owner-oauth"
      ? driveOwnerClient
      : await googleAuth.getClient();
  const accessToken = await client.getAccessToken();
  return typeof accessToken === "string" ? accessToken : accessToken.token;
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
