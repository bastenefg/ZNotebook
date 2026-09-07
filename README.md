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

Surgery records use `recordType: "surgery"` and store the surgery name, surgery date, optional desired endpoint in days, surgical notes, card photos, termination date, termination notes, and collection photos. Both surgery views can be sorted by performed or termination date. Active procedures show a calculated planned termination date and trigger a dismissible global reminder when due within two days or overdue; collected samples show the actual surgery-to-collection duration calculated from their calendar dates.

Built-in field names can be renamed through `Edit labels`. New sections can be created with `Add section`, and each section can choose its starting columns. Section titles can be renamed from their header controls. Columns can be added from the section header and removed from the table header hover control.

## Hosting path

The app can run locally or connect to a shared Google Drive folder through a small Cloud Run backend. In hosted mode, the browser signs users in with Google, the backend checks the allowed-user list, and the backend writes notebook records, surgery records, images, and videos into the shared Drive folder.

For day-to-day instructions, see `USER_GUIDE.md`. For admin operations such as adding authorized emails, rotating Drive tokens, and redeploying Cloud Run, see `ADMIN_GUIDE.md`.

For setup instructions, see `DEPLOYMENT.md`. For the exact GitHub Pages steps, see `GITHUB_PAGES.md`.

For a hosted shared notebook, put the Google OAuth Client ID and Cloud Run backend URL in `config.js` before deployment. Then lab members only need to open the app URL, click `Connect Drive`, and sign in with an allowed Google account.

Use `SETUP_CHECKLIST.md` for a step-by-step rollout checklist. The hosted `privacy.html` page can be used on the Google OAuth consent screen if Google asks for a privacy policy URL.

The `Backup` button exports/imports a JSON snapshot for local fallback or manual transfer. Drive-mode media files remain in Google Drive; the backup stores their Drive references.

Individual records have an `Export` button that opens a simple report view and the browser print dialog, which can be saved as PDF.

Images inserted in the rich-text editor can be resized proportionally with a mouse or touch drag. Their validated width is stored with the record and preserved in exported reports.

Record deletion is intentionally soft. Deleted notebook and surgery records disappear from normal lists but remain stored as JSON in Drive with a `deletedAt` timestamp; their media files are left untouched. Use the corresponding `Show deleted` filter and `Restore` action to recover them.

Section deletion is also soft. A deleted section remains in the shared configuration with a `deletedAt` timestamp, and its record files are left untouched. Use `Show deleted sections` and `Restore section` to recover it.

The repository can be public when hosted on GitHub Pages. The public app shell exposes only the Google Client ID and backend URL. Notebook data and media remain in the shared Google Drive folder behind the Cloud Run backend.

## Backend path

The current backend uses Google Drive as the file store. If the notebook becomes heavily used, metadata can later move to Postgres or SQLite while keeping Drive or lab storage for attachments.

Connection reads use up to six parallel record downloads. The backend rechecks Drive file versions on each connection/sync and reuses unchanged record bodies from a bounded in-memory cache. Folder listings follow every page. Existing files and the soft-delete format are unchanged; this update requires no Drive data migration.

The frontend starts loading Google sign-in and warming the backend when opened, shares duplicate connection attempts, and prevents an old reconnect from clearing a newer session. Login reads `/workspace` without uploading the local notebook. Connection progress and retry controls are visible on mobile and desktop.

## Regression checks

With Node.js 20 or later:

```powershell
node --check app.js
node --test tests/login.test.cjs
npm --prefix backend run check
npm --prefix backend test
npm --prefix backend run benchmark:workspace
```

These tests use simulated Google/Drive responses and do not access the live notebook. Frontend changes must be published to GitHub Pages and backend changes deployed to Cloud Run for both sets of improvements to take effect; see the existing deployment guides. Keep the current Drive folder, access list, and storage credentials when redeploying.

For desktop/mobile browser checks, run `node tests/browser-login.cjs` with Playwright installed (or set `PLAYWRIGHT_MODULE` to its installed path and `BROWSER_EXECUTABLE` to a Chromium browser). It intercepts all requests, tests the connection and retry UI at phone and desktop sizes, and writes screenshots to a temporary directory. The benchmark uses 24 fake records with simulated request latency; it is not a production timing measurement.
