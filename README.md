<img src="assets/logo.svg" alt="Folio Harbor logo" width="64" height="64">

# Folio Harbor

**A private library your AI can revisit.**

Keep useful knowledge as Markdown files in a private GitHub repository. Ask a compatible AI assistant to save a short note after a conversation, then ask it to find that note later. The notes stay readable without the assistant, the search index, or this project.

Folio Harbor is a template and a small index builder. It does not run an AI model. Your assistant supplies the conversation; GitHub stores the notes and their history.

## Start here

You need a GitHub account and an AI assistant that can access your private repository. To let the assistant **write** notes, its connection must support GitHub file writes. [The standard ChatGPT GitHub connection is read-only](https://help.openai.com/en/articles/11145903-connecting-github-to-chatgpt). Codex with suitable GitHub access can write, but availability varies by account and device. You can always edit a note in GitHub's web editor and use a read-only assistant to retrieve it.

1. On this repository, choose **Use this template → Create a new repository**. Name it anything you like, set it to **Private**, and create it. A template gives you new history; do not fork a repository containing personal notes. [GitHub template guide](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template).
2. In your assistant, connect GitHub and allow access to your new private repository. If the repository is missing, check the GitHub app's repository permissions and wait a few minutes. [ChatGPT connection guide](https://help.openai.com/en/articles/11145903-connecting-github-to-chatgpt).
3. Copy the prompt in [Assistant setup](docs/ASSISTANTS.md). Replace `OWNER/REPO` with your new repository name. Ask the assistant to read `README.md` and `AGENTS.md` in that repository.
4. Say: **“Archive this to my knowledge hub: The fictional Moonlight Library lends telescopes on Fridays.”** The assistant should search for an existing note, create or update one, then read it back. If it lacks a write tool, create the note in GitHub using [the note template](templates/note.md), then continue.
5. Say: **“What did I save about the Moonlight Library? Read the full note.”** Confirm the answer matches the saved file. Check the **Actions** tab for the index rebuild. If it has not finished, the assistant should read the note directly and say the index is pending.

The first two steps depend on your account and assistant. Setup time has not yet been measured with first-time users. [Troubleshooting](docs/OPERATIONS.md) covers missing permissions, failed indexing, and recovery.

## What is in the repository?

- `notes/`: your Markdown notes. A fresh template has no personal notes.
- `index.json` and `index/`: generated finding aids. These contain searchable words and summaries, so keep them private with your notes.
- `templates/note.md`: the required note shape.
- `examples/fictional-note.md`: an example outside `notes/`, so it is not part of your library.
- `scripts/build-index.ts`: a deterministic index builder using Node's standard library.

The index covers titles, summaries, topics, keywords, and note bodies. It uses exact normalized words of at least three characters, not semantic search. An assistant should try related words and read the matching full notes. If the index is stale or missing, it should inspect `notes/` and explain that search may be incomplete.

## Local use

With Node 22 or newer:

```sh
npm ci
npm run check
npm run index
```

The index builder has no runtime dependencies. TypeScript and Node types are development dependencies. The workflow runs the builder after a push to your repository's branch; its generated commit does not start another run. You can also run **Rebuild knowledge index** manually in GitHub Actions.

## Learn more

- [Assistant setup and compatibility](docs/ASSISTANTS.md)
- [How search and indexing work](docs/ARCHITECTURE.md)
- [Troubleshooting, backup, and recovery](docs/OPERATIONS.md)
- [Security and privacy](docs/SECURITY.md)
- [Contributing](CONTRIBUTING.md), [roadmap](ROADMAP.md), and [changelog](CHANGELOG.md)
- [One-minute demo script](docs/DEMO.md)

MIT licensed. This project is intentionally small: no server, hosted database, vector database, or required paid API.
