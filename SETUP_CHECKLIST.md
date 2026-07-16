# Setup Checklist

Use this as the practical rollout checklist for the hosted shared lab notebook.

## 1. Drive folder

- Create or reuse the shared ZNotebook Drive folder.
- Share it with lab members as needed.
- Share it with `znotebook-backend@labnotebook-502503.iam.gserviceaccount.com` as **Editor**.
- Keep the folder private to the team.

## 2. Google Cloud

- Use project `labnotebook-502503`.
- Enable Cloud Run, Cloud Build, Artifact Registry, Drive API, and IAM APIs.
- Create the `znotebook-backend` service account if needed.
- Do not download a service-account key.

## 3. OAuth

- Use the web OAuth Client ID:

```text
417347365496-bemjg51elajma1jevfjsjl1gccbmp9ge.apps.googleusercontent.com
```

- Add authorized JavaScript origins:

```text
https://bastenefg.github.io
http://localhost:8000
http://localhost:5173
```

## 4. Backend deploy

Deploy `backend/` to Cloud Run with:

```powershell
gcloud run deploy znotebook-api `
  --source ./backend `
  --project labnotebook-502503 `
  --region us-central1 `
  --service-account znotebook-backend@labnotebook-502503.iam.gserviceaccount.com `
  --allow-unauthenticated `
  --set-env-vars "^~^GOOGLE_CLIENT_ID=417347365496-bemjg51elajma1jevfjsjl1gccbmp9ge.apps.googleusercontent.com~DRIVE_FOLDER_ID=1WrlJN8VoKLzeyGiXb9InPKDm7t6kFi13~ALLOWED_EMAILS=baymon@mit.edu,alevalde@mit.edu,sharifla@mit.edu,majacquem@gmail.com~CORS_ORIGIN=https://bastenefg.github.io"
```

## 5. Frontend config

Update `config.js` after Cloud Run returns a URL:

```js
window.DEFINITELY_NOT_NOTION_CONFIG = {
  googleClientId: "417347365496-bemjg51elajma1jevfjsjl1gccbmp9ge.apps.googleusercontent.com",
  backendUrl: "https://YOUR_CLOUD_RUN_URL",
};
```

## 6. Test before rollout

- Open the hosted app.
- Click `Connect Drive`.
- Sign in with an allowed account.
- Create a test record.
- Upload one image or video.
- Refresh and reconnect.
- Confirm `definitely-not-notion.config.json`, `records/`, and `assets/` exist in Drive.
- Test one non-allowed account and confirm it is rejected.

## 7. Roll out

- Share the hosted app URL.
- Manage app access through `ALLOWED_EMAILS` on Cloud Run.
- Manage raw Drive folder access through Google Drive sharing.
