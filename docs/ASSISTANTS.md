# Assistant setup

Replace `OWNER/REPO` with the name of **your private repository**. Paste this into a conversation or your assistant's project instructions. A GitHub connection does not automatically load repository instructions.

> My knowledge hub is the private GitHub repository `OWNER/REPO`. Read its `README.md`, `AGENTS.md`, and `templates/note.md` before editing. The Markdown files in `notes/` are authoritative. Do not store credentials, full transcripts, or facts I did not ask you to save.
>
> When I ask you to archive something, first inspect `index.json` and likely matching index shards, then read relevant full notes. Update an existing note about the same subject, or create a new one at `notes/<first-two-id-characters>/<id>.md` using a unique lowercase hyphenated ID. Keep a short summary, useful search words, sources when relevant, and any uncertainty. Set `created` and `updated` to real dates. Related IDs must already exist. If you cannot search the index, inspect `notes/` and say the search was incomplete.
>
> For a GitHub update, fetch the latest file and SHA, merge the new information, and write using that SHA. If the write conflicts, fetch and merge again. Read the saved file back before saying it was archived. Do not edit `index.json` or `index/` by hand. Check the index workflow when available; if it is pending or failed, say so.
>
> When I ask a question about saved knowledge, find likely notes through `index.json`, `index/terms/`, `index/topics/`, and `index/recent.json`. Search several relevant words. For a hit like `ab:note-id`, read `index/entries/ab.json` to find its path, then read the full note. Cite the note path in your answer. If the index is stale or no match appears, inspect recent or direct note files before concluding that the information is absent.

## What works where

- **GitHub web editor:** Manual creation and updates are supported by GitHub. You can use any assistant with read access for retrieval.
- **Codex with a GitHub write connection:** This project was developed with a connection that can read and write files. Confirm your own account has equivalent permissions by creating and reading back one harmless test note.
- **Standard ChatGPT GitHub connection:** [OpenAI documents it as read-only](https://help.openai.com/en/articles/11145903-connecting-github-to-chatgpt). It can help retrieve notes when available, but this connection alone cannot archive them.
- **Other assistants, plans, and mobile surfaces:** Untested here. Require a live read, write, and read-back test before relying on them. A tool visible on desktop may not be available on a phone.

## Write access without a paid service

The simplest route is an assistant with a GitHub connection that can edit files in **only your private library**. Check its available tools before you grant access. This repository's Codex connection was tested with a create, read-back, update, and stale-SHA conflict. That result does not transfer to every account.

If your assistant only reads GitHub, let it draft a note and save the draft yourself in GitHub's web editor. This is free and keeps the write decision with you. Then ask the assistant to retrieve it in a new conversation.

For an MCP-capable assistant, [GitHub's official MCP server](https://github.com/github/github-mcp-server) offers file write tools. This route is **documented but not tested with this template**. Restrict the underlying GitHub credential to the single private library, give it only the contents permissions it needs, and keep the credential in your assistant's secret storage. Do not paste a token into a chat or note. A read-only MCP configuration cannot archive notes.

You can also clone your private library and use a local coding assistant to edit and push Markdown files. This is a familiar Git workflow for technical users, but it adds setup. Test a harmless note before relying on any of these routes. [GitHub's fine-grained token guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) explains repository-specific permissions.

If writes are unavailable, ask the assistant to draft a note in the template format, then paste it into your private repository in GitHub. The index workflow should run after the change reaches the branch you edited.

## Demo conversation

1. “Archive this: The fictional Moonlight Library lends telescopes on Fridays.”
2. The assistant searches, creates or updates a short note, and reads the saved file back.
3. “What does the Moonlight Library lend?”
4. The assistant reads the index and full note, then answers “telescopes” with the note path.

If step 2 cannot write, use the GitHub web editor. Do not treat a drafted answer as a saved note.
