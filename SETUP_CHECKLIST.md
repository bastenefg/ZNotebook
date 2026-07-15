# Setup Checklist

Use this as the practical rollout checklist for a shared lab notebook.

## 1. Create the shared Drive folder

- Create a Google Drive folder, for example `Lab Notebook`.
- Share it with the lab members or a Google Group.
- Copy the folder ID from the folder URL.

## 2. Create the Google OAuth app

- Create a Google Cloud project.
- Enable the Google Drive API and Google Picker API.
- Configure the OAuth consent screen.
- Use `Internal` if your lab has Google Workspace and everyone is in the same organization.
- Use `External` with test users for early testing if collaborators use personal or outside Google accounts.
- Use the hosted app URL as the application home page.
- Use `https://YOUR_HOSTED_APP_URL/privacy.html` as the privacy policy URL.
- Create a `Web application` OAuth Client ID.
- Add the app origin as an authorized JavaScript origin, for example `https://YOUR_GITHUB_USERNAME.github.io`. Do not include the repository path.
- Create a Google Picker API key.
- Restrict the key to the Google Picker API only.
- Restrict the key to the hosted website referrer, for example `https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPOSITORY/*`.
- Leave service account binding off.

## 3. Configure the app

Edit `config.js`:

```js
window.DEFINITELY_NOT_NOTION_CONFIG = {
  googleClientId: "YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com",
  googleDriveFolderId: "YOUR_SHARED_DRIVE_FOLDER_ID",
  googleApiKey: "YOUR_RESTRICTED_GOOGLE_PICKER_API_KEY",
  googleAppId: "YOUR_GOOGLE_CLOUD_PROJECT_NUMBER",
};
```

## 4. Host the files

- Put the files in a public GitHub repository.
- Enable GitHub Pages for the repository from the `main` branch and `/ (root)` folder.
- Open the hosted URL and confirm the app loads.

## 5. Test before rollout

- Connect Drive with your own Google account and select the shared folder in Google Picker.
- Create a test section and record.
- Upload one image or video in a record.
- Open the Drive folder and confirm `definitely-not-notion.config.json`, `records/`, and `assets/` were created.
- Test with a second Google account that has access to the folder.
- Use `Sync now` from both browsers to confirm shared records load.

## 6. Roll out to the team

- Share the hosted app URL.
- Tell people they only need the URL and access to the shared Drive folder; the first connection asks them to choose that folder in Google Picker.
- Manage future access from the Drive folder sharing settings.
