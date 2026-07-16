# Deployment

This app uses GitHub Pages for the public frontend and Google Cloud Run for a small private backend. The backend owns Drive access through a Google Cloud service account, so no Drive API key or Drive OAuth scope is exposed in the browser.

## Architecture

```text
GitHub Pages frontend
  -> Cloud Run backend
  -> private/shared Google Drive folder
```

Users sign in with Google in the browser. The browser sends a Google ID token to the backend. The backend verifies the token, checks the allowlist, and then reads/writes notebook files in the configured Drive folder using the Cloud Run service account.

## Google Drive setup

1. Create or reuse the shared ZNotebook Drive folder.
2. Share the folder with lab members as needed.
3. Share the same folder with the backend service account as **Editor**:

```text
znotebook-backend@labnotebook-502503.iam.gserviceaccount.com
```

The backend creates and uses this structure:

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

## Google Cloud setup

Use Google Cloud Shell or a local Google Cloud SDK install.

```powershell
gcloud auth login
gcloud config set project labnotebook-502503
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com drive.googleapis.com iam.googleapis.com
```

Create the backend service account if it does not already exist:

```powershell
gcloud iam service-accounts create znotebook-backend --display-name="ZNotebook backend"
```

## OAuth setup

Create or reuse a Google OAuth Client ID for web sign-in.

Authorized JavaScript origins:

```text
https://bastenefg.github.io
http://localhost:8000
http://localhost:5173
```

Do not add the `/ZNotebook/` path to JavaScript origins. Google expects origins only.

The current client ID is:

```text
417347365496-bemjg51elajma1jevfjsjl1gccbmp9ge.apps.googleusercontent.com
```

## Deploy backend

From the repository root, deploy the backend:

```powershell
gcloud run deploy znotebook-api `
  --source ./backend `
  --project labnotebook-502503 `
  --region us-central1 `
  --service-account znotebook-backend@labnotebook-502503.iam.gserviceaccount.com `
  --allow-unauthenticated `
  --set-env-vars "^~^GOOGLE_CLIENT_ID=417347365496-bemjg51elajma1jevfjsjl1gccbmp9ge.apps.googleusercontent.com~DRIVE_FOLDER_ID=1WrlJN8VoKLzeyGiXb9InPKDm7t6kFi13~ALLOWED_EMAILS=baymon@mit.edu,alevalde@mit.edu,sharifla@mit.edu,majacquem@gmail.com~CORS_ORIGIN=https://bastenefg.github.io"
```

`--allow-unauthenticated` is expected. Browsers must be able to reach the service, but the backend rejects requests unless they include a valid Google ID token from an allowed user.

After deployment, get the service URL:

```powershell
gcloud run services describe znotebook-api --project labnotebook-502503 --region us-central1 --format="value(status.url)"
```

## Configure frontend

Put the Cloud Run URL in `config.js`:

```js
window.DEFINITELY_NOT_NOTION_CONFIG = {
  googleClientId: "417347365496-bemjg51elajma1jevfjsjl1gccbmp9ge.apps.googleusercontent.com",
  backendUrl: "https://YOUR_CLOUD_RUN_URL",
};
```

Then commit and push to GitHub Pages.

## Test

1. Open `https://bastenefg.github.io/ZNotebook/`.
2. Click `Connect Drive`.
3. Sign in with one allowed Google account.
4. Confirm records load.
5. Create a test record.
6. Refresh and reconnect.
7. Confirm the record persists.
8. Test with an account that is not on the allowlist; it should be rejected.

## Notes

- The browser no longer receives a Drive API key or Drive OAuth access token.
- The backend service account can only access Drive content that is shared with that service account.
- To add or remove app users, update `ALLOWED_EMAILS` and redeploy Cloud Run.
- To add or remove Drive-level access, update the shared folder permissions.
