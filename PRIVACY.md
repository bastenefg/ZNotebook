# Privacy

Definitely not Notion is a static lab notebook app. It does not include a hosted application server, analytics service, or advertising tracker.

## What the app stores

In local-only mode, notebook records and uploaded media are stored in your browser's IndexedDB storage on your device.

In Google Drive mode, notebook configuration, record JSON files, images, and videos are stored in the shared Google Drive folder configured for the notebook. The app is designed to read and write the notebook files in that folder.

## Google sign-in and Drive access

When you connect Google Drive, the app requests a Google access token in your browser so it can use the Google Drive API. The token is kept in browser memory for the current session and is not sent to any separate backend service.

## Who can see notebook data

People who can access the configured Google Drive folder can see the notebook files stored there. Manage notebook membership by changing sharing permissions on that Drive folder.

## How to remove access or data

- Remove a person from the shared Google Drive folder to revoke notebook data access.
- Delete the notebook files from Drive to remove shared notebook data.
- Revoke the app's Google access from your Google Account security settings if you no longer want to use Drive sync.
