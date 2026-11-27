# Operations and recovery

## Index is missing or stale

Check the repository's **Actions** tab for **Rebuild knowledge index**. The workflow runs after a push to `main` and can be started manually. If it failed, open the log, fix the note named in the error, and rerun it. Locally, run `npm ci` once, then `npm run index`. Until the index is fresh, read notes directly and say search may be incomplete.

If the workflow cannot push, check **Settings → Actions → General → Workflow permissions** and repository branch rules. It needs permission to commit generated index files to `main`. Do not grant broader permissions than required. If a branch rule blocks the bot, run the builder locally and submit the generated files through your normal review path.

## A write failed or conflicted

Fetch the latest note and its SHA. Merge the new information into that version, then retry with the current SHA. Read the saved file back. Do not overwrite a newer note with an older draft. If an assistant cannot write, paste its draft into the GitHub web editor and verify the saved file there.

## Duplicate or invalid note

The builder reports the file and problem. IDs must be unique and related IDs must exist. Check the [metadata rules](ARCHITECTURE.md) and [template](../templates/note.md). A duplicate subject with a different ID is a judgment call: compare both full notes, preserve useful information, then merge or link them. The indexer prevents duplicate IDs, not semantic duplicates.

## Backup and restore

Keep a private clone or archive of your repository in a location you control. Git history lets you restore a prior note version. If an index file is damaged, regenerate it from the Markdown notes. Keep private backups private, because generated indexes contain searchable words from your notes. Never put tokens in notes or commits.

## Limits

Search matches normalized words, not meaning. Words shorter than three characters and number-only words are omitted. The index can lag a note write until Actions finishes. GitHub Actions minutes and storage limits depend on your plan; check current [GitHub billing guidance](https://docs.github.com/en/billing/concepts/product-billing/github-actions) if your usage grows. A bucket above 900 KB causes a clear build failure instead of creating a file that normal GitHub content tools may not read.
