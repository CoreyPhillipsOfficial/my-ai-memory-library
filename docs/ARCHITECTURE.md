# Architecture

Markdown in `notes/` is the only durable knowledge store. Git provides version history. `scripts/build-index.ts` reads every note, validates a small frontmatter format, and writes deterministic JSON. GitHub Actions rebuilds the index after changes to `main`. No service, database, embeddings, or AI API is required.

## Search

`index.json` lists note count, topics, statuses, and index paths. `index/terms/<first-two-letters>.json` maps normalized words to references. `index/entries/<shard>.json` maps references to paths and metadata. Topic, status, and recent lists provide other ways to find a note. A reference such as `ab:moonlight-library` means to fetch `index/entries/ab.json`, find that ID, and then read its `path`.

Words come from note IDs, titles, summaries, topics, keywords, and body text. The builder lowercases them, removes accents, and keeps words with at least three letters or digits and at least one letter. This is exact word matching; it does not understand synonyms or rank meaning. The assistant should search several words and inspect full notes.

Entry shards use the first two hex characters of an ID's SHA-256 digest. All output files are capped at 900 KB to stay under [GitHub's normal contents API limit](https://docs.github.com/en/rest/repos/contents). A larger bucket makes the build fail clearly. At much larger scale, split that bucket or add a longer shard prefix.

## Notes and validation

Each note needs `id`, `title`, `summary`, `topics`, `status`, `created`, and `updated`. `keywords` and `related` are optional. IDs, topics, keywords, and related IDs are lowercase slugs. Valid statuses are `active`, `waiting`, `someday`, `done`, `reference`, and `archived`. Dates use `YYYY-MM-DD`; `updated` cannot precede `created`. Related IDs must exist. Duplicate IDs, repeated fields, unknown fields, invalid lists, and bad dates fail the build before the index is changed.

The parser intentionally accepts a small YAML subset: one-line text values and inline lists such as `[research, books]`. Quote text containing a colon followed by a space or a comment marker with JSON double quotes, for example `summary: "Cost: unknown"`. The Markdown body is unrestricted. A full YAML parser would allow more syntax but add a dependency and a larger input surface.

## Consistency and recovery

The Action fetches the latest `main`, rebuilds, and retries a rejected push. Its commit uses `GITHUB_TOKEN`, which [does not trigger another push run](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow). A failed build does not change notes or commit a new index. Local partial index writes after an I/O failure can be repaired with `npm run index`; generated files are never the source of truth. The assistant must read a saved note back and disclose if indexing is pending or failed.

GitHub template repositories give each user a new repository and history rather than a fork of someone else's notes. The template contains no personal notes. A future dashboard could read Markdown and the generated index first. SQLite or PostgreSQL should only be added if interactive features require it.
