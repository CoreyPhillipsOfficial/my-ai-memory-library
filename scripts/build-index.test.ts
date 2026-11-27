import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildIndex } from "./build-index.ts";

function note(id: string, body = "A paper lantern glows blue.", fields = ""): string {
  return `---
id: ${id}
title: Moonlight Library
summary: A fictional telescope lending library.
topics: [community, astronomy]
status: reference
created: 2026-11-26
updated: 2026-11-26
keywords: [telescopes]
related: []
${fields}---

# Moonlight Library

${body}
`;
}

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "open-memory-shelf-"));
  await mkdir(join(root, "notes"));
  return root;
}

async function writeNote(root: string, id: string, content = note(id)): Promise<void> {
  await writeFile(join(root, "notes", `${id}.md`), content);
}

async function indexJson(root: string, path: string): Promise<unknown> {
  return JSON.parse(await readFile(join(root, path), "utf8"));
}

test("empty shelf builds and a note can be created, found, and updated", async () => {
  const root = await fixture();
  try {
    await buildIndex(root);
    assert.equal((await indexJson(root, "index.json") as { note_count: number }).note_count, 0);
    await writeNote(root, "moonlight-library");
    await buildIndex(root);
    const shard = createHash("sha256").update("moonlight-library").digest("hex").slice(0, 2);
    const ref = `${shard}:moonlight-library`;
    const catalog = await indexJson(root, "index.json") as { note_count: number; topics: Record<string, number> };
    assert.equal(catalog.note_count, 1);
    assert.equal(catalog.topics.community, 1);
    assert.deepEqual((await indexJson(root, "index/terms/la.json") as Record<string, string[]>).lantern, [ref]);
    assert.deepEqual(await indexJson(root, "index/status/reference.json"), [ref]);
    const entries = await indexJson(root, `index/entries/${shard}.json`) as { path: string }[];
    assert.equal(entries[0].path, "notes/moonlight-library.md");
    await writeNote(root, "moonlight-library", note("moonlight-library", "A copper telescope sees Saturn."));
    await buildIndex(root);
    assert.deepEqual((await indexJson(root, "index/terms/sa.json") as Record<string, string[]>).saturn, [ref]);
    await assert.rejects(readFile(join(root, "index/terms/la.json"), "utf8"), { code: "ENOENT" });
    assert.match(await readFile(join(root, "notes/moonlight-library.md"), "utf8"), /Saturn/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("duplicates and invalid metadata leave the previous index intact", async () => {
  const root = await fixture();
  try {
    await writeNote(root, "moonlight-library");
    await buildIndex(root);
    const before = await readFile(join(root, "index.json"), "utf8");
    const cases = [
      ["duplicate ID", "second.md", note("moonlight-library"), /duplicate id/],
      ["unknown field", "moonlight-library.md", note("moonlight-library", "Text", "secret: value\n"), /unknown field/],
      ["duplicate field", "moonlight-library.md", note("moonlight-library", "Text", "id: another\n"), /duplicate id/],
      ["invalid date", "moonlight-library.md", note("moonlight-library").replace("2026-11-26", "2026-02-30"), /invalid created/],
      ["unknown relation", "moonlight-library.md", note("moonlight-library").replace("related: []", "related: [missing-note]"), /unknown related id/],
      ["self relation", "moonlight-library.md", note("moonlight-library").replace("related: []", "related: [moonlight-library]"), /cannot relate to itself/],
      ["malformed list", "moonlight-library.md", note("moonlight-library").replace("topics: [community, astronomy]", "topics: community"), /inline list/],
      ["missing frontmatter", "moonlight-library.md", "# Just text\n", /missing frontmatter/],
    ] as const;
    for (const [label, filename, content, error] of cases) {
      await writeFile(join(root, "notes", filename), content);
      await assert.rejects(buildIndex(root), error, label);
      assert.equal(await readFile(join(root, "index.json"), "utf8"), before, label);
      if (filename === "second.md") await rm(join(root, "notes", filename));
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("valid related IDs and quoted punctuation are preserved", async () => {
  const root = await fixture();
  try {
    await writeNote(root, "moonlight-library", note("moonlight-library").replace("related: []", "related: [sky-map]").replace("summary: A fictional telescope lending library.", 'summary: "Lending: telescopes and maps."'));
    await writeNote(root, "sky-map", note("sky-map"));
    await buildIndex(root);
    const shard = createHash("sha256").update("moonlight-library").digest("hex").slice(0, 2);
    const entries = await indexJson(root, `index/entries/${shard}.json`) as { id: string; summary: string; related: string[] }[];
    const entry = entries.find(value => value.id === "moonlight-library");
    assert.equal(entry?.summary, "Lending: telescopes and maps.");
    assert.deepEqual(entry?.related, ["sky-map"]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("a large collection stays in bounded shards", async () => {
  const root = await fixture();
  try {
    for (let i = 0; i < 1200; i++) {
      const id = `fictional-note-${String(i).padStart(4, "0")}`;
      await writeNote(root, id, note(id, `The catalog item number is ${i}.`));
    }
    await buildIndex(root);
    assert.equal((await indexJson(root, "index.json") as { note_count: number }).note_count, 1200);
    const files = await readdir(join(root, "index", "entries"));
    assert.ok(files.length > 100);
    assert.ok(files.length <= 256);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("symlinks cannot pull outside notes into the index or redirect generated writes", async () => {
  const root = await fixture();
  try {
    await writeNote(root, "moonlight-library");
    await buildIndex(root);
    const outside = join(root, "outside.txt");
    await writeFile(outside, "keep this unchanged");
    await rm(join(root, "index/terms/la.json"));
    await symlink(outside, join(root, "index/terms/la.json"));
    await assert.rejects(buildIndex(root), /unsafe file type/);
    assert.equal(await readFile(outside, "utf8"), "keep this unchanged");
    await rm(join(root, "index/terms/la.json"));
    await rm(join(root, "notes"), { recursive: true });
    await symlink(root, join(root, "notes"));
    await assert.rejects(buildIndex(root), /not a symlink/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
