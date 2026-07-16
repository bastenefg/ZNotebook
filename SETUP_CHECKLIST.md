# Setup Checklist

Use this checklist for the hosted shared lab notebook when Shared drives are not available.

## 1. Storage-owner Drive folder

- Choose a Google account with Drive storage quota to own the notebook files.
- Prefer a dedicated account used only for ZNotebook storage.
- Create a normal Drive folder for ZNotebook, or share the existing folder with the storage-owner account as **Editor**.
- Copy the folder ID.

## 2. Google Cloud

- Use project `labnotebook-502503`.
- Enable Cloud Run, Cloud Build, Artifact Registry, Drive API, and IAM APIs.
- Keep the Cloud Run service account:

```text
znotebook-backend@labnotebook-502503.iam.gserviceaccount.com
```

## 3. User sign-in OAuth

- Use this web OAuth Client ID for browser sign-in:

```text
417347365496-bemjg51elajma1jevfjsjl1gccbmp9ge.apps.googleusercontent.com
```

- Authorized JavaScript origins:

```text
https://bastenefg.github.io
http://localhost:8000
http://localhost:5173
```

## 4. Storage-owner OAuth

- Create a separate OAuth client named `ZNotebook Drive Owner`.
- Type: **Web application**.
- Authorized redirect URI:

```text
http://localhost:8090/oauth2callback
```

- From the repository root:

```powershell
cd backend
npm install
$env:DRIVE_OWNER_CLIENT_ID="PASTE_DRIVE_OWNER_CLIENT_ID"
$env:DRIVE_OWNER_CLIENT_SECRET="PASTE_DRIVE_OWNER_CLIENT_SECRET"
npm run create-drive-refresh-token
```

- Sign in as the storage-owner Google account.
- Keep the printed refresh token private.

## 5. Backend deploy

Deploy `backend/` to Cloud Run with the storage-owner OAuth values:

```powershell
gcloud run deploy znotebook-api `
  --source ./backend `
  --project labnotebook-502503 `
  --region us-central1 `
  --service-account znotebook-backend@labnotebook-502503.iam.gserviceaccount.com `
  --allow-unauthenticated `
  --set-env-vars "^~^GOOGLE_CLIENT_ID=417347365496-bemjg51elajma1jevfjsjl1gccbmp9ge.apps.googleusercontent.com~DRIVE_FOLDER_ID=1WrlJN8VoKLzeyGiXb9InPKDm7t6kFi13~ALLOWED_EMAILS=baymon@mit.edu,alevalde@mit.edu,sharifla@mit.edu,majacquem@gmail.com~CORS_ORIGIN=https://bastenefg.github.io~DRIVE_OWNER_CLIENT_ID=PASTE_DRIVE_OWNER_CLIENT_ID~DRIVE_OWNER_CLIENT_SECRET=PASTE_DRIVE_OWNER_CLIENT_SECRET~DRIVE_OWNER_REFRESH_TOKEN=PASTE_REFRESH_TOKEN"
```

## 6. Frontend config

`config.js` should contain:

```js
window.DEFINITELY_NOT_NOTION_CONFIG = {
  googleClientId: "417347365496-bemjg51elajma1jevfjsjl1gccbmp9ge.apps.googleusercontent.com",
  backendUrl: "https://znotebook-api-417347365496.us-central1.run.app",
};
```

## 7. Test before rollout

- Open the hosted app.
- Click `Connect Drive`.
- Sign in with an allowed account.
- Create a test record.
- Upload one image or video.
- Refresh and reconnect.
- Confirm `definitely-not-notion.config.json`, `records/`, and `assets/` exist in Drive.
- Test one non-allowed account and confirm it is rejected.

## 8. Roll out

- Share the hosted app URL.
- Manage app access through `ALLOWED_EMAILS` on Cloud Run.
- Manage raw Drive folder access through Google Drive sharing.
