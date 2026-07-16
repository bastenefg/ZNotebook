# Definitely not Notion

A lightweight lab notebook prototype for tracking project records in separate notebook sections. Each section has its own table, columns, and rich detail pages with formatted text, lists, links, images, and videos.

## Run locally

Open `index.html` in a browser. The app stores records in browser IndexedDB, including embedded images and videos.

## Current data model

- `sectionId`
- `title`
- `startDate`
- `status`: built-in values plus custom statuses
- `outcome`: built-in values plus custom outcomes
- `labels`: custom tags for projects, assays, organisms, owners, batches, or instruments
- `summary`
- `customFields`: user-defined columns such as owner, project, batch, instrument, strain, or priority
- `content`: rich HTML note body

Built-in field names can be renamed through `Edit labels`. New sections can be created with `Add section`, and each section can choose its starting columns. Columns can be added from the section header and removed from the table header hover control.

## Hosting path

The app can now run locally or connect to a shared Google Drive folder through a small Cloud Run backend. In hosted mode, the browser signs users in with Google, the backend checks the allowed-user list, and the backend writes sections, columns, records, images, and videos into the shared Drive folder.

For setup instructions, see `DEPLOYMENT.md`. For the exact GitHub Pages steps, see `GITHUB_PAGES.md`.

For a hosted shared notebook, put the Google OAuth Client ID and Cloud Run backend URL in `config.js` before deployment. Then lab members only need to open the app URL, click `Connect Drive`, and sign in with an allowed Google account.

Use `SETUP_CHECKLIST.md` for a step-by-step rollout checklist. The hosted `privacy.html` page can be used on the Google OAuth consent screen if Google asks for a privacy policy URL.

The `Backup` button exports/imports a JSON snapshot for local fallback or manual transfer. Drive-mode media files remain in Google Drive; the backup stores their Drive references.

Individual records have an `Export` button that opens a simple report view and the browser print dialog, which can be saved as PDF.

Record deletion is intentionally soft. Deleted records disappear from normal tables but remain stored as JSON in Drive with a `deletedAt` timestamp. Use `Show deleted records` and `Restore` to recover them.

The repository can be public when hosted on GitHub Pages. The public app shell exposes only the Google Client ID and backend URL. Notebook data and media remain in the shared Google Drive folder behind the Cloud Run backend.

## Backend path

The current backend uses Google Drive as the file store. If the notebook becomes heavily used, metadata can later move to Postgres or SQLite while keeping Drive or lab storage for attachments.
