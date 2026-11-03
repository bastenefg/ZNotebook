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

Connection reads use up to six parallel record downloads. The backend rechecks Drive file versions on each connection/sync and reuses unchanged record bodies and revision tokens from a bounded in-memory cache. Cold reads fetch metadata and then that exact binary revision, so the content and conflict token always refer to the same version. This adds a metadata request on cold reads; warm reads reuse unchanged snapshots. Folder listings follow every page. Existing files and the soft-delete format are unchanged; this update requires no Drive data migration.

The frontend starts loading Google sign-in and warming the backend when opened, shares duplicate connection attempts, and prevents an old reconnect from clearing a newer session. Login reads `/workspace`; afterward it can retry explicitly queued record edits whose saved Drive version still matches. It does not upload unrelated local records or demo data. Connection progress and retry controls are visible on mobile and desktop.

## Record save protection

Record edits commit to IndexedDB together with a persistent pending-write entry before a network save starts. Navigation waits for local transactions, while network uploads are debounced and serialized. Only an acknowledgement for the saved revision can clear its pending entry. Browser database version 3 preserves all version 2 records/drafts and closes older database connections. Upgrades from version 1 retain cached records as review drafts until an identical Drive copy is found or the user recovers them separately.

Reconnect merges the remote snapshot with pending edits. Different remote versions require review, and neither client nor backend permits forced record overwrites. Legacy pending drafts without a strong revision token also require review: a matching timestamp alone does not prove their baseline is unchanged. Recovery can download record JSON or create a separate recovered record while preserving the original Drive record. These downloads contain media references, not an independent attachment backup.

Pending uploads retry with bounded backoff while the editing tab is visible, online, and signed in; returning to the tab or reconnecting the network also resumes them. An interrupted request is reconciled by reading Drive before retrying. The exact submitted payload is persisted before upload, so a lost response followed by more typing can recognize the earlier successful save without requiring a recovered copy. Acknowledged baseline lineage also prevents an edit arriving during local acknowledgement from reusing the previous revision. Genuine divergent remote content still requires review.

Write baselines identify the physical file, ETag, and immutable content revision. Drive's numeric file version is used only to invalidate caches: real-provider testing showed it can advance after an upload while the ETag, content revision, and modification time remain unchanged. Legacy tokens are accepted or migrated only when their full original baseline still matches; previously conflicted legacy drafts without that proof remain preserved for review. No Drive record migration is required.

An app-wide Web Lock permits one editable tab in each browser storage area; other tabs remain read-only until they acquire ownership and reload the saved cache. Browsers without Web Locks remain read-only. Different users/devices can edit independently; the backend sends Drive's observed ETag with a resumable conditional update. Only a writer whose version still matches can commit, including when requests reach different server instances. The losing draft remains on its device for review. A separate private registry reserves a single generated Drive file ID for each new logical record, preventing duplicate creates during retries/races. Existing record IDs and attachment locations stay unchanged.

This protects record edits, including submitted surgery changes. Configuration/section saves still need their separate durability and concurrent-edit update. Direct raw Drive writes by older software can also bypass the application's protection, so use the coordinated rollout in `ADMIN_GUIDE.md`. Local drafts depend on this browser's storage: clearing it, losing the device, or killing the browser before a transaction commits can still lose work. Independent backups remain necessary. No research-file migration, bulk rewrite, or attachment deletion is part of this change.

Implementation references: [Drive v2 File revisions and ETags](https://developers.google.com/workspace/drive/api/reference/rest/v2/files), [revision-pinned downloads](https://developers.google.com/workspace/drive/api/reference/rest/v2/files/get), [resumable update](https://developers.google.com/workspace/drive/api/reference/rest/v2/files/update), [Google Chromium conditional-upload tests](https://chromium.googlesource.com/chromium/src/google_apis/+/9c91d8c99d9383b0cae9ab6a5c540b1d18158386/drive/drive_api_requests_unittest.cc), and [pre-generated file IDs](https://developers.google.com/workspace/drive/api/guides/create-file). The actual provider contract was additionally verified with synthetic files outside the research folder; a fabricated malformed ETag returned 500 without changing bytes, whereas real stale tags and the losing concurrent writer returned 412. Generic 500 errors remain failures, not successful saves or assumed conflicts.

## Regression checks

With Node.js 20 or later:

```powershell
node --check app.js
node --check persistence.js
node --test tests/login.test.cjs
npm --prefix backend run check
npm --prefix backend test
npm --prefix backend run benchmark:workspace
```

These tests use simulated Google/Drive responses and do not access the live notebook. Frontend changes must be published to GitHub Pages and backend changes deployed to Cloud Run for both sets of improvements to take effect; see the existing deployment guides. Keep the current Drive folder, access list, and storage credentials when redeploying.

For desktop/mobile browser checks, run `node tests/browser-login.cjs` with Playwright installed (or set `PLAYWRIGHT_MODULE` to its installed path and `BROWSER_EXECUTABLE` to a Chromium browser). It intercepts all requests, tests the connection and retry UI at phone and desktop sizes, and writes screenshots to a temporary directory. The benchmark uses 24 fake records with simulated request latency; it is not a production timing measurement.

With the same Playwright setup, run `node --test tests/persistence.test.cjs` and `node tests/save-loss-browser.cjs`. These use real browser IndexedDB and synthetic records to exercise interrupted transactions, quota errors, navigation, offline reload, conflicts, migration, and delayed/lost network responses. Every app network request is intercepted; no production account, notebook, or Drive credentials are used.

Also run `node tests/tab-concurrency-browser.cjs` and `node tests/concurrent-edit-browser.cjs`. The latter connects two isolated browser profiles to two independent backend instances sharing a fake Drive storage boundary; it verifies the conflict and recovery flow end to end. Backend race tests gate both uploads at their final commit, so a process-local mutex cannot make them pass accidentally.

Run `node tests/automatic-sync-browser.cjs` for interrupted-upload retries, phone resume/online events, preserved editing focus, and automatic-sync eligibility checks. The persistence tests also cover lost acknowledgements with further typing and edits at the acknowledgement boundary.

The opt-in `backend/tools/probe-drive-conditional-write.js --allow-create-isolated-test-data` is different: it uses the supplied owner OAuth environment credentials to create a new synthetic folder/file outside the research folder, tests real conditional writes and generated-ID retries, and retains the synthetic artifacts. It accepts no existing destination/file IDs and performs no deletes. Never run it as part of ordinary unit tests or point it at research files.
