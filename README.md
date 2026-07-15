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

The app can now run locally or connect to a shared Google Drive folder. In Drive mode, sections, columns, and records are written into the shared folder so lab members with access can open the hosted app and load the same notebook.

For setup instructions, see `DEPLOYMENT.md`. For the exact GitHub Pages steps, see `GITHUB_PAGES.md`.

For a hosted shared notebook, put the Google OAuth Client ID and Drive folder ID in `config.js` before deployment. Then lab members only need to open the app URL and click `Connect Drive`.

Use `SETUP_CHECKLIST.md` for a step-by-step rollout checklist. The hosted `privacy.html` page can be used on the Google OAuth consent screen if Google asks for a privacy policy URL.

The `Backup` button exports/imports a JSON snapshot for local fallback or manual transfer. Drive-mode media files remain in Google Drive; the backup stores their Drive references.

Individual records have an `Export` button that opens a simple report view and the browser print dialog, which can be saved as PDF.

The repository can be public when hosted on GitHub Pages. The public app shell exposes `config.js`, but notebook data and media remain in the shared Google Drive folder and require Drive permissions.

## Future backend path

If the notebook becomes heavily used, a later version can move metadata to a small backend with Postgres or SQLite and keep Drive or lab storage for attachments.
