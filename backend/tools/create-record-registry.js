"use strict";

// One-time deployment setup. Only creates a NEW JSON file; never selects,
// replaces, moves or deletes an existing research/config/registry file.
const { randomUUID } = require("node:crypto");
const { OAuth2Client } = require("google-auth-library");

async function createRecordRegistry({ folderId, fetchDrive }) {
  if (typeof folderId !== "string" || !/^[A-Za-z0-9_-]+$/.test(folderId)) throw new Error("A valid DRIVE_FOLDER_ID is required.");
  const generated = await fetchDrive("https://www.googleapis.com/drive/v3/files/generateIds?count=1&space=drive&type=files");
  const fileId = generated.ids?.[0];
  if (typeof fileId !== "string" || !/^[A-Za-z0-9_-]+$/.test(fileId)) throw new Error("Drive did not provide a new file ID.");
  const name = `notebook-record-id-registry-${randomUUID()}.json`;
  const boundary = `registry_${randomUUID()}`;
  const metadata = { id: fileId, name, parents: [folderId], mimeType: "application/json" };
  const body = `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({ schema: 1, records: {} })}\r\n--${boundary}--\r\n`;
  const created = await fetchDrive("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,parents", {
    method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body,
  });
  if (created.id !== fileId || created.name !== name || created.mimeType !== "application/json" || !created.parents?.includes(folderId)) {
    throw new Error("Drive did not confirm the new registry's identity and location. Do not configure the backend until checked.");
  }
  return { fileId, name, folderId };
}

async function main() {
  if (process.argv.length !== 3 || process.argv[2] !== "--create-new-registry") throw new Error("Use --create-new-registry only for the one-time deployment setup.");
  const auth = new OAuth2Client(process.env.DRIVE_OWNER_CLIENT_ID, process.env.DRIVE_OWNER_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: process.env.DRIVE_OWNER_REFRESH_TOKEN });
  const access = await auth.getAccessToken();
  const token = typeof access === "string" ? access : access.token;
  const fetchDrive = async (url, options = {}) => {
    const response = await fetch(url, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`New registry setup failed (${response.status}); no existing file was modified. Check for a newly created registry before rerunning.`);
    return response.json();
  };
  const result = await createRecordRegistry({ folderId: process.env.DRIVE_FOLDER_ID, fetchDrive });
  console.log(JSON.stringify({ ...result, setting: "RECORD_ID_REGISTRY_FILE_ID", existingFilesModified: false }));
}

if (require.main === module) main().catch(error => {
  console.error(error.message?.startsWith("New registry setup") || error.message?.startsWith("Use --") ? error.message : "Registry setup failed. No existing file was modified; do not change the backend setting until the new registry is verified.");
  process.exitCode = 1;
});

module.exports = { createRecordRegistry };
