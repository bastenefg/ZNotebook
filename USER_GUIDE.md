# INFUS Notebook User Guide

INFUS Notebook is a shared lab notebook for organizing experiments, meeting notes, protocols, and other project records. It is intentionally straightforward: the main view is a set of tables, and each table row opens into a rich notebook page.

## Open the App

Use the hosted app:

```text
https://bastenefg.github.io/ZNotebook/
```

Click `Connect Drive`, then sign in with the Google account your admin authorized for the notebook. If you see a message saying your account is not allowed, ask the notebook admin to add that exact email address.

The app may ask you to connect again after a while. This is normal Google sign-in behavior. Click `Connect Drive` and sign in again.

## Main Notebook View

The front page shows one or more notebook sections. A section is a table, such as `Experiment` or `Meeting notes`.

Each row is one record. Depending on how the section was configured, columns can include:

- Title
- Start date
- Status
- Outcome
- Labels
- Summary
- Custom fields such as owner, project, batch, instrument, sample, or priority

Use the search box to find records across visible sections. Use `Sync` to pull the newest version from Drive, especially when several people are editing around the same time.

## Surgery Cards and Collected Samples

Open `Surgeries` from the top navigation. The page has two views:

- `Active surgeries` contains procedures that have not been terminated. Enter a desired endpoint in calendar days when adding or editing a surgery; the app calculates and displays its planned termination date in the active list.
- `Collected samples` contains procedures whose termination and tissue collection have been recorded. Each entry clearly shows the number of calendar days from surgery to collection.

Use `Sort by` in either view to order records by `Date performed` or `Termination date`, then use the adjacent arrow button to switch between latest and earliest dates first. In Active surgeries, termination sorting uses the calculated planned termination date and leaves unscheduled procedures at the end. In Collected samples, it uses the recorded termination date.

For a new procedure, click `Take picture` on a phone. The app requests the rear camera so you can photograph the completed surgery card immediately. Confirm the photo, add a surgery name, review the surgery date (today is selected by default), enter the desired endpoint in days when known, and add any surgical notes. You can also choose existing photos or use `Add manually` when no card image is available.

Open an active surgery to edit its name, surgery date, desired endpoint, or notes and to attach more card photos. Changing the surgery date or endpoint immediately updates the planned termination preview. Click a photo to inspect it at full size.

To remove a surgery created by mistake, open it and click `Delete surgery`. The procedure disappears from its normal list, but its details and photos are retained in Drive. Use `Show deleted` in the corresponding Active surgeries or Collected samples view, open the deleted surgery, and click `Restore surgery` to recover it.

When an active surgery reaches two calendar days before its planned termination date, a reminder appears below the top navigation throughout both Notebook and Surgeries. The reminder also identifies procedures due today or overdue. Click a surgery name to open it, or use the close button to dismiss the currently listed surgery/date reminders on that browser. Newly due surgeries and changed planned dates can still trigger a new reminder.

When the animal is euthanized and tissue is collected, open the active surgery and click `Terminate & collect`. Confirm the termination date (today is selected by default), add termination or collection notes, and attach any relevant photos. Saving moves the procedure to `Collected samples`. Collection details and additional photos can still be added later.

In the hosted app, Drive must be connected before surgery records can be added or edited. This prevents important card photos from remaining only in temporary browser storage.

## Create a Record

1. Find the section where the record belongs.
2. Click `New`.
3. Fill in the title and any available fields.
4. Save the record.

Click anywhere on a row to open the full detail page.

## Edit a Record Page

The record page works like a standard text editor. You can add formatted text, headings, lists, links, images, and videos.

Common things to add:

- Experimental aim and hypothesis
- Setup notes and protocol changes
- Reagent lots, sample IDs, instrument settings, and analysis links
- Results, images, videos, and interpretation
- Next steps or follow-up questions

The editor saves automatically. Watch the save indicator near the top of the page. If it says `Saving...`, wait a moment before closing. If it says `Sync needed` or `Save failed`, click `Sync` and check whether another user changed the same record.

## Add Images and Videos

Use the image or video button in the editor toolbar. Uploaded files are stored in the notebook's Drive storage through the backend.

For very large videos, upload may take time. If an upload fails, try a smaller file first. If small uploads also fail, tell the admin.

## Statuses, Outcomes, and Labels

Statuses and outcomes are editable lists. Use the plus button next to the status or outcome selector on a record page to add a new option.

Labels are free-form tags. Type a label and add it to the record. Labels are useful for projects, organisms, assays, owners, sample batches, instruments, or analysis stages.

Any authorized app user can currently update notebook structure, including adding sections, columns, statuses, outcomes, and labels.

## Add or Change Sections

Use `Add section` below the existing tables to create another table. For example, you could create:

- Meeting notes
- Protocols
- Analysis runs
- Reagent logs
- Sample tracking

When creating a section, choose its starting columns and add any extra columns needed for that table.

Use the pencil icon beside a section title to rename it. Use the trash icon to remove a section from the active notebook. Removing a section hides the section and its records, but does not erase them from storage. Enable `Show deleted sections`, then click `Restore section` to recover it.

To add a column to an existing section, use the section's add-column control. To remove a column, hover over the column header and use the small remove control. Removing a column only removes that column from the table layout; it does not hard-delete old Drive files.

## Export a Record to PDF

Open the record, then click `Export`.

The app opens a simple report view and your browser print dialog. Choose `Save as PDF` as the destination to save the report as a PDF.

## Deleted Records

Deleting a notebook record or surgery hides it from normal lists, but the data is intentionally kept in Drive with a deletion timestamp. Surgery card and collection photos are also retained.

To recover a deleted record:

1. Enable `Show deleted records` for notebook records, or `Show deleted` in the relevant surgery view.
2. Open the deleted record.
3. Click `Restore` or `Restore surgery`.

Sections use the same recovery principle: deleting one adds a deletion timestamp to the shared configuration while leaving all of its record files untouched. This soft-delete behavior is there to protect the team from accidental deletions.

## Backups

Use `Backup` to export or import a JSON snapshot of the notebook. This is useful for manual snapshots or moving local data into the hosted notebook.

In Drive mode, uploaded media files, surgery cards, and collection photos stay in Drive. The backup stores references to those files.

## Collaboration Tips

- Click `Sync` before starting a long editing session.
- Avoid having two people edit the same record at the same time.
- Use labels consistently for projects, assays, organisms, and owners.
- Put final conclusions near the top of long records so they are easy to scan later.
- Do not manually edit the raw Drive files unless the admin asks you to.

## Troubleshooting

If you cannot sign in, make sure you are using the exact Google account the admin authorized.

If the app asks you to reconnect, click `Connect Drive` again.

If a record or image seems missing, click `Sync` and refresh the page.

If an upload fails, try a smaller file. If that also fails, send the admin the error message.

If the app says the backend authorization expired or was revoked, the admin needs to refresh the storage-owner Drive token.
