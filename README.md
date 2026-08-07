# INFUS Notebook

A lightweight shared lab notebook for project records, animal surgery cards, and collected-sample tracking. Notebook sections have configurable tables and rich detail pages; the separate Surgeries workflow is optimized for mobile photo capture.

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

Surgery records use `recordType: "surgery"` and store the surgery name, surgery date, optional desired endpoint in days, surgical notes, card photos, termination date, termination notes, and collection photos. Active procedures show a calculated planned termination date and trigger a dismissible global reminder when due within two days or overdue; collected samples show the actual surgery-to-collection duration calculated from their calendar dates.

Built-in field names can be renamed through `Edit labels`. New sections can be created with `Add section`, and each section can choose its starting columns. Section titles can be renamed from their header controls. Columns can be added from the section header and removed from the table header hover control.

## Hosting path

The app can run locally or connect to a shared Google Drive folder through a small Cloud Run backend. In hosted mode, the browser signs users in with Google, the backend checks the allowed-user list, and the backend writes notebook records, surgery records, images, and videos into the shared Drive folder.

For day-to-day instructions, see `USER_GUIDE.md`. For admin operations such as adding authorized emails, rotating Drive tokens, and redeploying Cloud Run, see `ADMIN_GUIDE.md`.

For setup instructions, see `DEPLOYMENT.md`. For the exact GitHub Pages steps, see `GITHUB_PAGES.md`.

For a hosted shared notebook, put the Google OAuth Client ID and Cloud Run backend URL in `config.js` before deployment. Then lab members only need to open the app URL, click `Connect Drive`, and sign in with an allowed Google account.

Use `SETUP_CHECKLIST.md` for a step-by-step rollout checklist. The hosted `privacy.html` page can be used on the Google OAuth consent screen if Google asks for a privacy policy URL.

The `Backup` button exports/imports a JSON snapshot for local fallback or manual transfer. Drive-mode media files remain in Google Drive; the backup stores their Drive references.

Individual records have an `Export` button that opens a simple report view and the browser print dialog, which can be saved as PDF.

Record deletion is intentionally soft. Deleted records disappear from normal tables but remain stored as JSON in Drive with a `deletedAt` timestamp. Use `Show deleted records` and `Restore` to recover them.

Section deletion is also soft. A deleted section remains in the shared configuration with a `deletedAt` timestamp, and its record files are left untouched. Use `Show deleted sections` and `Restore section` to recover it.

The repository can be public when hosted on GitHub Pages. The public app shell exposes only the Google Client ID and backend URL. Notebook data and media remain in the shared Google Drive folder behind the Cloud Run backend.

## Backend path

The current backend uses Google Drive as the file store. If the notebook becomes heavily used, metadata can later move to Postgres or SQLite while keeping Drive or lab storage for attachments.
