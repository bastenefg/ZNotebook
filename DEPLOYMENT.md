# Deployment

This app is designed so one person sets up the hosted URL and shared Google Drive folder. Everyone else opens the URL, clicks `Connect Drive`, signs in with Google, selects the shared folder in Google Picker, and uses the shared notebook.

## Recommended low-cost hosting

Use GitHub Pages for the app files. It hosts static HTML, CSS, and JavaScript from a GitHub repository, which is enough for this app. See GitHub's overview: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages

The Google Drive folder stores notebook data. Hosting only serves the app shell.

For a GitHub Pages walkthrough, see `GITHUB_PAGES.md`.

## Google Drive setup

1. Create a Google Drive folder for the notebook, for example `Lab Notebook`.
2. Share the folder with the lab members or a Google Group.
3. Copy the folder ID from the URL:

   ```text
   https://drive.google.com/drive/folders/FOLDER_ID_IS_HERE
   ```

The app will create these files inside that folder:

```text
Lab Notebook/
  definitely-not-notion.config.json
  records/
    rec_abc123.json
    rec_def456.json
  assets/
    rec_abc123/
      image.png
      video.mp4
```

## Google OAuth setup

1. Go to Google Cloud Console.
2. Create a project, for example `Definitely not Notion`.
3. Enable the Google Drive API and Google Picker API.
4. Configure the OAuth consent screen.
5. Create an OAuth Client ID.
6. Choose `Web application`.
7. Add the hosted app origin as an authorized JavaScript origin.
8. Copy the Client ID.
9. Create an API key for Google Picker.
10. Restrict the API key to the Google Picker API.
11. Restrict the API key to your hosted website referrer, for example `https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPOSITORY/*`.
12. Do not bind the API key to a service account.
13. Copy the Google Cloud project number.

For GitHub Pages, the authorized JavaScript origin should be only:

```text
https://YOUR_GITHUB_USERNAME.github.io
```

Do not include the repository path in the origin.

If the OAuth consent screen asks for app URLs, use the full hosted app URL as the application home page and `https://YOUR_HOSTED_APP_URL/privacy.html` as the privacy policy URL. The repository also includes `PRIVACY.md` with the same content for review.

If your lab uses Google Workspace, set the OAuth app to `Internal` if available. If you use personal Gmail accounts or external collaborators, use test users during early testing or prepare for Google app verification.

References:

- Google Identity token model: https://developers.google.com/identity/oauth2/web/guides/use-token-model
- Google Drive API scopes: https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- Google Drive uploads: https://developers.google.com/workspace/drive/api/guides/manage-uploads

## App setup

Before hosting, edit `config.js`:

```js
window.DEFINITELY_NOT_NOTION_CONFIG = {
  googleClientId: "YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com",
  googleDriveFolderId: "YOUR_SHARED_DRIVE_FOLDER_ID",
  googleApiKey: "YOUR_RESTRICTED_GOOGLE_PICKER_API_KEY",
  googleAppId: "YOUR_GOOGLE_CLOUD_PROJECT_NUMBER",
};
```

Then deploy the folder. Lab members only need to:

1. Open the hosted app URL.
2. Click `Connect Drive`.
3. Sign in with Google.
4. Select the shared notebook folder in Google Picker.

After that, records are saved as JSON files in the shared Drive folder. Local IndexedDB remains a cache/fallback.

For local testing, you can also leave `config.js` blank and paste the Client ID, folder ID, restricted Picker API key, and project number in the `Connect Drive` dialog.

For a practical rollout sequence, follow `SETUP_CHECKLIST.md`.

## Notes

- This first Drive version uses Google Drive as a shared file store, not a database.
- GitHub Pages can be public because it serves only the app shell. Records, note contents, images, and videos remain in the shared Drive folder.
- The app requests the narrower `https://www.googleapis.com/auth/drive.file` scope and uses Google Picker so each user explicitly selects the shared folder.
- The public `config.js` contains identifiers and a restricted browser API key, not an OAuth client secret. Keep the API key restricted to Google Picker and your hosted referrers, and keep the Drive folder itself restricted to the team.
- If you tested an older version that requested full Drive access, revoke the old app grant in your Google Account security settings and reconnect so the narrower permission is used.
- Each record is saved as a separate JSON file to reduce accidental overwrites.
- Record deletion is soft: deleted records are hidden in the app but kept in Drive with a `deletedAt` timestamp. Use `Show deleted records` and `Restore` in the app to recover them.
- Use `Sync now` to pull the latest records from Drive while the app is open.
- If two people edit the same record at the same time, the app checks Drive's modified timestamp before saving and asks before overwriting a newer Drive version.
- Images and videos are uploaded to an `assets/` folder in Drive when Drive mode is connected. Local-only mode still embeds media in browser storage.
- The `Backup` button exports/imports local JSON snapshots. In Drive mode, backup files include Drive media references, not copies of the binary media files.
