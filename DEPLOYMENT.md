# Deployment

This app uses GitHub Pages for the public frontend and Google Cloud Run for a small private backend. The browser only receives a Google sign-in ID token. Drive access stays on the backend.

Because Shared drives are not available on the current Google account, the backend should write to Drive as a dedicated **storage-owner Google account** with normal Drive storage quota. This avoids the service-account quota error.

## Architecture

```text
GitHub Pages frontend
  -> Cloud Run backend
  -> storage-owner Google Drive folder
```

Users sign in with Google in the browser. The backend verifies their identity and checks `ALLOWED_EMAILS`. If allowed, the backend writes notebook files into the configured Drive folder using the private storage-owner refresh token.

## Drive Folder

Use either:

- a dedicated Google account created for ZNotebook storage, recommended, or
- an existing account with enough Drive quota.

Create a normal Drive folder owned by that account, or share the existing ZNotebook folder with that storage-owner account as **Editor**. Copy the folder ID from the URL:

```text
https://drive.google.com/drive/folders/FOLDER_ID_IS_HERE
```

The backend creates and uses:

```text
Lab Notebook/
  definitely-not-notion.config.json
  records/
    record-id.json
  assets/
    record-id/
      image.png
      video.mp4
```

Record deletion is soft: records are marked with `deletedAt` and hidden by default, but the JSON files remain in Drive.

## Google Cloud Setup

Use Google Cloud Shell or a local Google Cloud SDK install.

```powershell
gcloud auth login
gcloud config set project labnotebook-502503
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com drive.googleapis.com iam.googleapis.com
```

The Cloud Run runtime service account can stay as:

```text
znotebook-backend@labnotebook-502503.iam.gserviceaccount.com
```

It does not need Drive folder access when the storage-owner OAuth variables are configured.

## Frontend Sign-In OAuth

Use the existing Google OAuth Client ID for user sign-in:

```text
417347365496-bemjg51elajma1jevfjsjl1gccbmp9ge.apps.googleusercontent.com
```

Authorized JavaScript origins:

```text
https://bastenefg.github.io
http://localhost:8000
http://localhost:5173
```

Do not add the `/ZNotebook/` path to JavaScript origins. Google expects origins only.

## Storage-Owner OAuth

Create a separate OAuth client for the backend Drive owner token:

1. Google Cloud Console -> APIs & Services -> Credentials.
2. Create credentials -> OAuth client ID.
3. Application type: **Web application**.
4. Name: `ZNotebook Drive Owner`.
5. Authorized redirect URI:

```text
http://localhost:8090/oauth2callback
```

Copy that client ID and client secret. Do not commit them.

From the repository root:

```powershell
cd backend
npm install
$env:DRIVE_OWNER_CLIENT_ID="PASTE_DRIVE_OWNER_CLIENT_ID"
$env:DRIVE_OWNER_CLIENT_SECRET="PASTE_DRIVE_OWNER_CLIENT_SECRET"
npm run create-drive-refresh-token
```

Open the printed URL, sign in as the storage-owner Google account, approve Drive access, then copy the refresh token printed in the terminal. Do not paste that token into chat or commit it.

## Deploy Backend

From the repository root, redeploy Cloud Run with the storage-owner OAuth values:

```powershell
gcloud run deploy znotebook-api `
  --source ./backend `
  --project labnotebook-502503 `
  --region us-central1 `
  --service-account znotebook-backend@labnotebook-502503.iam.gserviceaccount.com `
  --allow-unauthenticated `
  --set-env-vars "^~^GOOGLE_CLIENT_ID=417347365496-bemjg51elajma1jevfjsjl1gccbmp9ge.apps.googleusercontent.com~DRIVE_FOLDER_ID=1WrlJN8VoKLzeyGiXb9InPKDm7t6kFi13~ALLOWED_EMAILS=baymon@mit.edu,alevalde@mit.edu,sharifla@mit.edu,majacquem@gmail.com~CORS_ORIGIN=https://bastenefg.github.io~DRIVE_OWNER_CLIENT_ID=PASTE_DRIVE_OWNER_CLIENT_ID~DRIVE_OWNER_CLIENT_SECRET=PASTE_DRIVE_OWNER_CLIENT_SECRET~DRIVE_OWNER_REFRESH_TOKEN=PASTE_REFRESH_TOKEN"
```

`--allow-unauthenticated` is expected. Browsers must be able to reach the service, but the backend rejects requests unless they include a valid Google ID token from an allowed user.

Check health:

```powershell
Invoke-WebRequest -UseBasicParsing https://znotebook-api-417347365496.us-central1.run.app/health
```

The response should include:

```json
{"ok":true,"app":"znotebook-api","driveAuthMode":"storage-owner-oauth"}
```

## Frontend Config

`config.js` should contain:

```js
window.DEFINITELY_NOT_NOTION_CONFIG = {
  googleClientId: "417347365496-bemjg51elajma1jevfjsjl1gccbmp9ge.apps.googleusercontent.com",
  backendUrl: "https://znotebook-api-417347365496.us-central1.run.app",
};
```

## Test

1. Open `https://bastenefg.github.io/ZNotebook/`.
2. Click `Connect Drive`.
3. Sign in with one allowed Google account.
4. Confirm records load.
5. Create a test record.
6. Upload a small image.
7. Refresh and reconnect.
8. Confirm the record and image persist.
9. Test with an account that is not on the allowlist; it should be rejected.

## Notes

- The browser no longer receives a Drive API key or Drive OAuth access token.
- The backend Drive token belongs to the storage-owner account and is stored only in Cloud Run environment variables.
- To add or remove app users, update `ALLOWED_EMAILS` and redeploy Cloud Run.
- To move notebook storage, update `DRIVE_FOLDER_ID` and make sure the storage-owner account can edit that folder.
