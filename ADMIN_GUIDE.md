# INFUS Notebook Admin Guide

This guide is for operating the hosted INFUS Notebook app. Keep private values such as client secrets and refresh tokens out of GitHub, chat, screenshots, and shared docs.

## Current Deployment

Frontend:

```text
https://bastenefg.github.io/ZNotebook/
```

Backend:

```text
YOUR_CLOUD_RUN_BACKEND_URL
```

The exact Google Cloud project, Cloud Run service account, Drive folder ID, current allowlist, Drive owner client secret, and Drive owner refresh token should be treated as private operational details. Find them in Google Cloud Console, not in the public repository.

Useful places to look:

- Cloud Run service: `Cloud Run` -> your backend service -> `Variables & Secrets`
- OAuth clients: `APIs & Services` -> `Credentials`
- OAuth publishing status: `APIs & Services` -> `OAuth consent screen`
- Drive storage folder: the folder URL in the storage-owner Google Drive account

The public frontend config contains only public identifiers:

```js
window.DEFINITELY_NOT_NOTION_CONFIG = {
  googleClientId: "YOUR_PUBLIC_GOOGLE_CLIENT_ID",
  backendUrl: "YOUR_CLOUD_RUN_BACKEND_URL",
};
```

Those values are not secrets, but the Drive owner client secret and refresh token are secrets.

## How Access Works

The GitHub Pages site is public, but it is only the app shell. Notebook data and uploaded media are not stored in GitHub.

Users sign in with Google in the browser. The browser sends a Google ID token to the Cloud Run backend. The backend verifies the token and checks the email against `ALLOWED_EMAILS` or `ALLOWED_DOMAIN`.

The backend writes records and media to Drive using the private storage-owner OAuth credentials stored in Cloud Run environment variables:

```text
DRIVE_OWNER_CLIENT_ID
DRIVE_OWNER_CLIENT_SECRET
DRIVE_OWNER_REFRESH_TOKEN
```

Do not put those values in `config.js` or any public repository file.

## Add or Remove Authorized Users

The simplest method is the Google Cloud Console:

1. Open Google Cloud Console.
2. Go to `Cloud Run`.
3. Select the Google Cloud project that hosts the notebook backend.
4. Open service `znotebook-api`.
5. Click `Edit & deploy new revision`.
6. Open `Variables & Secrets`.
7. Edit `ALLOWED_EMAILS`.
8. Add or remove email addresses in the comma-separated list.
9. Click `Deploy`.

Include the full final list, not only the new email. Example:

```text
person1@example.com,person2@example.com,newperson@example.com
```

You can also update the allowlist with `gcloud`:

```powershell
gcloud run services update znotebook-api --project YOUR_PROJECT_ID --region YOUR_REGION --update-env-vars '^~^ALLOWED_EMAILS=person1@example.com,person2@example.com,newperson@example.com'
```

After updating access, ask the user to refresh the app and click `Connect Drive` again.

## Optional Domain Access

The backend also supports `ALLOWED_DOMAIN`. For example, setting this allows every verified `@mit.edu` Google account:

```text
ALLOWED_DOMAIN=mit.edu
```

Only use this if the whole domain should have access. For tighter control, keep using `ALLOWED_EMAILS`.

## Check Backend Health

Use this after deployments or auth changes:

```powershell
Invoke-WebRequest -UseBasicParsing YOUR_CLOUD_RUN_BACKEND_URL/health
```

The response should include:

```json
{"ok":true,"app":"znotebook-api","driveAuthMode":"storage-owner-oauth"}
```

If `driveAuthMode` is `service-account`, the storage-owner OAuth variables are missing or incomplete.

## Refresh the Drive Owner Token

Do this if users see an error about `invalid_grant`, expired Drive owner authorization, or revoked authorization.

First, check the Google OAuth consent screen. For the hosted notebook, the publishing status should be `In production`. Tokens created while the app is in `Testing` can expire after 7 days.

From the repository root, generate a new token:

```powershell
cd backend
$env:DRIVE_OWNER_CLIENT_ID="PASTE_DRIVE_OWNER_CLIENT_ID"
$env:DRIVE_OWNER_CLIENT_SECRET="PASTE_DRIVE_OWNER_CLIENT_SECRET"
npm run create-drive-refresh-token
```

Open the printed URL, sign in as the storage-owner Google account, approve Drive access, then copy the refresh token printed in the terminal.

Update Cloud Run with the new refresh token:

```powershell
gcloud run services update znotebook-api --project YOUR_PROJECT_ID --region YOUR_REGION --update-env-vars "DRIVE_OWNER_REFRESH_TOKEN=PASTE_NEW_REFRESH_TOKEN"
```

Then check `/health` and test image upload.

## Deploy Backend Changes

Use this when backend code changes or when you need to recreate the service configuration. Replace the secret placeholders locally before running the command.

```powershell
gcloud run deploy znotebook-api --source ./backend --project YOUR_PROJECT_ID --region YOUR_REGION --service-account YOUR_BACKEND_SERVICE_ACCOUNT --allow-unauthenticated --set-env-vars "^~^GOOGLE_CLIENT_ID=YOUR_PUBLIC_GOOGLE_CLIENT_ID~DRIVE_FOLDER_ID=YOUR_DRIVE_FOLDER_ID~ALLOWED_EMAILS=person1@example.com,person2@example.com~CORS_ORIGIN=https://bastenefg.github.io~DRIVE_OWNER_CLIENT_ID=PASTE_DRIVE_OWNER_CLIENT_ID~DRIVE_OWNER_CLIENT_SECRET=PASTE_DRIVE_OWNER_CLIENT_SECRET~DRIVE_OWNER_REFRESH_TOKEN=PASTE_REFRESH_TOKEN"
```

`--allow-unauthenticated` is expected. Cloud Run must be reachable from the browser, but the backend rejects requests without a valid Google sign-in token from an allowed user.

## Deploy Frontend Changes

Frontend changes are served by GitHub Pages from the public repository.

1. Make the code change locally.
2. Check that `config.js` still points to the correct backend:

```js
window.DEFINITELY_NOT_NOTION_CONFIG = {
  googleClientId: "YOUR_PUBLIC_GOOGLE_CLIENT_ID",
  backendUrl: "YOUR_CLOUD_RUN_BACKEND_URL",
};
```

3. Commit and push to `main`.
4. Wait for GitHub Pages to update.
5. Open the hosted app and test sign-in, record save, media upload, and export.

## Change the Drive Storage Folder

1. Create or choose the new Drive folder.
2. Make sure the storage-owner Google account can edit that folder.
3. Copy the folder ID from the Drive URL.
4. Update Cloud Run:

```powershell
gcloud run services update znotebook-api --project YOUR_PROJECT_ID --region YOUR_REGION --update-env-vars "DRIVE_FOLDER_ID=PASTE_NEW_FOLDER_ID"
```

5. Test by creating a record and uploading a small image.

The backend creates these items inside the configured folder:

```text
definitely-not-notion.config.json
records/
assets/
```

Notebook and surgery metadata are both stored as individual JSON files in `records/`. Surgery-card and collection photos use the same private per-record folders under `assets/`; no additional Drive folder setup or backend deployment is required for the Surgeries feature.

## Deploying simultaneous-record-edit protection

This release changes both the frontend and backend write protocol. It must be deployed during a coordinated pause in edits: an older Cloud Run revision can still perform unconditional writes, and simply switching traffic does not stop its in-flight requests. Finish acknowledged saves or download pending drafts first. Keep all old writers paused until the new backend is serving all traffic and old write requests have finished/stopped. Publish the new frontend and have users reload before resuming edits. Do not clear browser storage.

Create one new private registry JSON file in the notebook's top-level Drive folder (alongside config, never inside `records/`). This adds a metadata file; it does not rewrite or move existing research files. With the existing owner OAuth credentials and `DRIVE_FOLDER_ID` supplied only in the local process environment, run:

```powershell
node backend/tools/create-record-registry.js --create-new-registry
```

Record the returned `fileId` as the backend environment variable `RECORD_ID_REGISTRY_FILE_ID`. Use the existing registry ID on subsequent deployments; do not recreate or empty it. The file contains `{"schema":1,"records":{}}` initially and tracks reservations for newly created records. Retain it in full-folder backups. Existing records require no migration. If setup fails after an uncertain response, inspect for the newly created registry before rerunning; never replace an existing research/config file to obtain this registry.

Deploy Cloud Run with the current credentials, allowlist, Drive folder and other settings preserved, adding only this variable with `--update-env-vars`. Stage and check the new revision before sending it traffic. `/health` must report `recordWriteProtocol:2` and `recordCreationConfigured:true`; the latter means an ID is configured, not that the registry's contents have been verified. Verify the new registry separately. A missing/invalid registry stops new record creation and preserves client drafts; it never falls back to unsafe creation. Records already on Drive can still use conditional updates.

The frontend refuses record uploads when `/workspace` does not advertise protocol 2. The backend rejects older/unversioned and forced record writes. Old pending drafts without strong revision tokens may require `Review drafts` after upgrade, even when timestamps match. Coordinate settings/section edits separately: `/config` has not yet received the concurrent-write protection in this release.

Do not roll back to the old unconditional-write backend while editors are active. Pause writes and drain requests before any rollback; preserve the registry, pending browser drafts and all existing Drive files. Validation should use isolated test records, never overwrite a real experiment as a smoke test.

## Recovery and Deletion Policy

The app uses soft deletion. When a user deletes a record, the record JSON remains in Drive and gets a `deletedAt` timestamp. Users can restore it from `Show deleted records`.

Deleting a section follows the same policy. The section remains in `definitely-not-notion.config.json` with a `deletedAt` timestamp, and every record assigned to that section remains unchanged in `records/`. Users can recover the section and its records from `Show deleted sections`.

Hard deletion from the app is intentionally disabled for Drive records. However, someone with direct raw Drive access could still delete files manually from Google Drive. Limit raw Drive folder access to admins or trusted storage maintainers.

For extra protection:

- Keep the storage-owner account secure with two-factor authentication.
- Avoid giving broad raw Drive folder access to regular users.
- Periodically export a notebook backup from the app.
- Use Google Drive trash and version history for manual recovery when needed.

## Security Notes

- Public GitHub Pages hosting is acceptable because it serves only the frontend shell.
- `config.js` may expose the Google Client ID and backend URL; those are public identifiers, not secrets.
- Do not expose the Drive owner client secret or refresh token.
- The backend is public on the internet, but protected by Google ID token verification plus the allowlist.
- The storage-owner Google account can access all notebook data in the configured Drive folder.
- Anyone with raw Drive folder access may be able to view, edit, move, or delete raw notebook files outside the app.
- Consider moving `DRIVE_OWNER_CLIENT_SECRET` and `DRIVE_OWNER_REFRESH_TOKEN` into Google Secret Manager if the notebook becomes more widely used.

## Common Problems

`This Google account is not allowed to use this notebook.`

Add the exact email address to `ALLOWED_EMAILS`, redeploy, then ask the user to reconnect.

`Google sign-in expired. Please connect again.`

Ask the user to click `Connect Drive` and sign in again.

`Failed to fetch` or `Could not reach the notebook storage service.`

Open `YOUR_CLOUD_RUN_BACKEND_URL/health`. A healthy service returns JSON containing `"ok":true`. If it works for the admin but not the affected user, have that user test the same health URL, reload the notebook, and retry without a VPN, content blocker, or restrictive browser profile. A missing allowlist entry is not a network failure; it produces the separate `This Google account is not allowed` message.

`Drive owner authorization expired or was revoked.`

Regenerate `DRIVE_OWNER_REFRESH_TOKEN`, update Cloud Run, and confirm the OAuth app is `In production`.

`Service Accounts do not have storage quota.`

Check `/health`. It should say `driveAuthMode` is `storage-owner-oauth`. If it says `service-account`, the Drive owner OAuth variables are missing or incomplete.

Image or video upload fails.

Check Cloud Run logs, confirm the storage-owner Drive account has quota, and test a small file first.

CORS error in the browser.

Confirm `CORS_ORIGIN` is:

```text
https://bastenefg.github.io
```

Do not include `/ZNotebook/` in `CORS_ORIGIN`.
