# Security and privacy

Keep your own knowledge repository **private**. This project has no server and does not send notes to a paid API, but any AI assistant you connect may process the content you share with it. Review that assistant's privacy terms and grant access only to the repositories it needs.

The template contains only fictional example content in `examples/`. `notes/` starts empty. Do not put passwords, API keys, recovery codes, or full conversation transcripts in notes. The generated index contains note summaries and searchable words, so treat it as private too. Git history retains deleted material; deleting a note or changing a repository to private does not erase prior public exposure.

Use the smallest GitHub permissions that support your workflow. The index Action has `contents: write` to commit generated files. The check Action has `contents: read`. Third-party assistants may have different access; test with a harmless note and verify the saved file. Do not make a personal knowledge repository public to make a connector work.

An assistant with repository access can read the notes it is allowed to retrieve. Its provider may retain prompts, tool responses, or logs under its own policies. Give each connection access only to your private library, review its data controls, and disconnect it when you no longer use it. A fine-grained token is still a secret. Store it in a credential manager or the assistant's secret setting, never in a prompt, repository file, screenshot, or issue.

If you accidentally commit sensitive information, remove access to the exposed credential first, then rotate it. Removing a file in a later commit does not remove it from Git history. Seek help before rewriting shared history, and do not paste the secret into a public issue.

Before publishing changes to this template, check the working tree and full Git history for personal notes, indexes, credentials, private URLs, and account-specific instructions. A passing automated test is not a complete secret audit. Report a suspected exposure privately to the repository maintainer rather than opening an issue containing the secret.
