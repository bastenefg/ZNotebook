# GitHub Pages Setup

This app is safe to host as a public static site because the site only serves the app shell. Notebook records, note contents, images, and videos are stored in the configured Google Drive folder and remain protected by that folder's sharing permissions.

Public files include `config.js`, which contains the Google OAuth Client ID and Drive folder ID. Those values are identifiers, not passwords. They do not grant Drive access without a signed-in Google account that already has permission to the folder.

## 1. Create the repository

The repository for this app is:

```text
https://github.com/bastenefg/ZNotebook
```

It is public so GitHub Pages can serve the app shell.

## 2. Push the local app

From this folder, add your GitHub repository as `origin`:

```powershell
git remote add origin https://github.com/bastenefg/ZNotebook.git
git push -u origin main
```

If `origin` already exists, replace it:

```powershell
git remote set-url origin https://github.com/bastenefg/ZNotebook.git
git push -u origin main
```

## 3. Enable GitHub Pages

In GitHub:

1. Open the repository.
2. Go to `Settings` > `Pages`.
3. Under `Build and deployment`, choose `Deploy from a branch`.
4. Set branch to `main` and folder to `/ (root)`.
5. Save.

The app URL will usually be:

```text
https://bastenefg.github.io/ZNotebook/
```

If you create a user site repository named `YOUR_GITHUB_USERNAME.github.io`, the URL will be:

```text
https://bastenefg.github.io/
```

## 4. Update Google OAuth

In your Google OAuth Client, add the GitHub Pages origin under `Authorized JavaScript origins`.

For a project site, use only the origin:

```text
https://bastenefg.github.io
```

Do not include the repository path in the authorized origin.

Use the hosted privacy page as the privacy policy URL if Google asks:

```text
https://bastenefg.github.io/ZNotebook/privacy.html
```

## 5. Test

Open the GitHub Pages URL, click `Connect Drive`, and sign in with a Google account that has access to the shared Drive folder.

Confirm:

- Records load after reconnecting Drive.
- A second approved user can see the same records.
- Images and videos load after refresh.
- `Sync now` pulls changes from another browser.
