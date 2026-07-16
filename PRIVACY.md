# Privacy

Definitely not Notion is a static lab notebook app. It does not include a hosted application server, analytics service, or advertising tracker.

## What the app stores

In local-only mode, notebook records and uploaded media are stored in your browser's IndexedDB storage on your device.

In hosted Google Drive mode, notebook configuration, record JSON files, images, and videos are stored in the shared Google Drive folder configured for the notebook. The app sends notebook changes to a Cloud Run backend, and the backend reads and writes the notebook files in that folder.

## Google sign-in and Drive access

When you connect to the hosted notebook, the app requests a Google sign-in ID token in your browser. The app sends that token to the Cloud Run backend so the backend can verify your Google account and check whether your email is allowed. The short-lived ID token may be kept in browser storage until it expires so refreshes can reconnect smoothly. The browser does not receive Google Drive API credentials.

## Who can see notebook data

People allowed by the backend can use the app. People who can access the configured Google Drive folder can see the raw notebook files stored there. Manage app membership through the backend allowlist and raw file access through Drive folder sharing.

## How to remove access or data

- Remove a person from the backend allowlist to revoke app access.
- Remove a person from the shared Google Drive folder to revoke raw notebook file access.
- Delete the notebook files from Drive to remove shared notebook data.
- Revoke the app's Google access from your Google Account security settings if you no longer want to use Drive sync.
