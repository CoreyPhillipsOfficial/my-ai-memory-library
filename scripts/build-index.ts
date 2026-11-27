import { createHash } from "node:crypto";
import { readdir, readFile, mkdir, rm, writeFile, lstat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type Entry = {
  id: string;
  path: string;
  title: string;
  summary: string;
  topics: string[];
  status: string;
  created: string;
  updated: string;
  keywords: string[];
  related: string[];
};

const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const statuses = new Set(["active", "waiting", "someday", "done", "reference", "archived"]);
const required = ["id", "title", "summary", "topics", "status", "created", "updated"];
const listKeys = new Set(["topics", "keywords", "related"]);

async function markdownFiles(dir: string): Promise<string[]> {
  const paths: string[] = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory()) paths.push(...await markdownFiles(path));
    else if (item.isFile() && item.name.endsWith(".md")) paths.push(path);
  }
  return paths.sort();
}

function parseList(value: string, key: string, path: string): string[] {
  if (!/^\[[^\[\]]*\]$/.test(value)) throw new Error(`${path}: ${key} must be an inline list`);
  const inner = value.slice(1, -1).trim();
  const items = inner ? inner.split(",").map(x => x.trim()) : [];
  if (items.some(x => !x)) throw new Error(`${path}: ${key} has an empty item`);
  return items;
}

function parseScalar(value: string, key: string, path: string): string {
  const text = value.trim();
  if (text.startsWith('"')) {
    try {
      const decoded: unknown = JSON.parse(text);
      if (typeof decoded === "string") return decoded;
    } catch { /* Report the same format error below. */ }
    throw new Error(`${path}: ${key} has an invalid quoted value`);
  }
  if (/(^#|\s#|:\s)/.test(text)) throw new Error(`${path}: quote ${key} as a JSON string`);
  return text;
}

function parseEntry(source: string, path: string): Entry {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(source);
  if (!match) throw new Error(`${path}: missing frontmatter`);
  const data: Record<string, string | string[]> = {};
  const allowed = new Set([...required, "keywords", "related"]);
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim()) continue;
    const field = /^([a-z]+):\s*(.*)$/.exec(line);
    if (!field) throw new Error(`${path}: invalid frontmatter line: ${line}`);
    const [, key, raw] = field;
    if (!allowed.has(key)) throw new Error(`${path}: unknown field ${key}`);
    if (key in data) throw new Error(`${path}: duplicate ${key}`);
    data[key] = listKeys.has(key) ? parseList(raw, key, path) : parseScalar(raw, key, path);
  }
  for (const key of required) if (!data[key] || (Array.isArray(data[key]) && !data[key].length)) {
    throw new Error(`${path}: missing ${key}`);
  }
  const scalar = (key: string): string => {
    const value = data[key];
    if (typeof value !== "string") throw new Error(`${path}: ${key} must be text`);
    return value;
  };
  const list = (key: string): string[] => {
    const value = data[key] ?? [];
    if (!Array.isArray(value)) throw new Error(`${path}: ${key} must be a list`);
    return value;
  };
  const id = scalar("id");
  const topics = list("topics");
  const keywords = list("keywords");
  const related = list("related");
  const status = scalar("status");
  if (!slug.test(id)) throw new Error(`${path}: invalid id`);
  if (!topics.every(x => slug.test(x))) throw new Error(`${path}: topics must be slugs`);
  if (!keywords.every(x => slug.test(x))) throw new Error(`${path}: keywords must be slugs`);
  if (!related.every(x => slug.test(x))) throw new Error(`${path}: related must contain ids`);
  if (related.includes(id)) throw new Error(`${path}: a note cannot relate to itself`);
  for (const [key, values] of [["topics", topics], ["keywords", keywords], ["related", related]] as const) {
    if (new Set(values).size !== values.length) throw new Error(`${path}: duplicate ${key}`);
  }
  if (!statuses.has(status)) throw new Error(`${path}: invalid status ${status}`);
  for (const key of ["created", "updated"]) {
    const value = scalar(key);
    const date = new Date(`${value}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value) {
      throw new Error(`${path}: invalid ${key}`);
    }
  }
  if (scalar("updated") < scalar("created")) throw new Error(`${path}: updated precedes created`);
  return { id, path, title: scalar("title"), summary: scalar("summary"), topics, status,
    created: scalar("created"), updated: scalar("updated"), keywords, related };
}

function shard(value: string): string {
  return value.slice(0, 2).padEnd(2, "_");
}

function entryShard(id: string): string {
  return createHash("sha256").update(id).digest("hex").slice(0, 2);
}

function terms(entry: Entry, source: string): string[] {
  const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  const searchable = [entry.id, entry.title, entry.summary, ...entry.topics, ...entry.keywords, body].join(" ")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return [...new Set((searchable.match(/[a-z0-9]{3,}/g) ?? []).filter(x => /[a-z]/.test(x)))];
}

function json(value: unknown): string { return `${JSON.stringify(value, null, 2)}\n`; }

export async function buildIndex(root: string): Promise<void> {
  const notesDir = join(root, "notes");
  if (!(await lstat(notesDir)).isDirectory()) throw new Error("notes/ must be a directory, not a symlink");
  const files = await markdownFiles(notesDir);
  const entries: Entry[] = [];
  const sources = new Map<string, string>();
  const digest = createHash("sha256");
  for (const file of files) {
    const path = relative(root, file).split("\\").join("/");
    const source = await readFile(file, "utf8");
    sources.set(path, source);
    digest.update(path).update("\0").update(source).update("\0");
    entries.push(parseEntry(source, path));
  }
  entries.sort((a, b) => a.id.localeCompare(b.id));
  const ids = new Set<string>();
  for (const entry of entries) {
    if (ids.has(entry.id)) throw new Error(`duplicate id: ${entry.id}`);
    ids.add(entry.id);
  }
  for (const entry of entries) for (const id of entry.related) {
    if (!ids.has(id)) throw new Error(`${entry.path}: unknown related id ${id}`);
  }

  const entryShards = new Map<string, Entry[]>();
  const termShards = new Map<string, Map<string, string[]>>();
  const topicLists = new Map<string, string[]>();
  const statusLists = new Map<string, string[]>();
  for (const entry of entries) {
    const bucket = entryShard(entry.id);
    const ref = `${bucket}:${entry.id}`;
    if (!entryShards.has(bucket)) entryShards.set(bucket, []);
    entryShards.get(bucket)!.push(entry);
    for (const term of terms(entry, sources.get(entry.path)!)) {
      const key = shard(term);
      if (!termShards.has(key)) termShards.set(key, new Map());
      const list = termShards.get(key)!;
      if (!list.has(term)) list.set(term, []);
      list.get(term)!.push(ref);
    }
    for (const topic of entry.topics) {
      if (!topicLists.has(topic)) topicLists.set(topic, []);
      topicLists.get(topic)!.push(ref);
    }
    if (!statusLists.has(entry.status)) statusLists.set(entry.status, []);
    statusLists.get(entry.status)!.push(ref);
  }

  const output = new Map<string, string>();
  const counts = (lists: Map<string, string[]>): Record<string, number> => Object.fromEntries(
    [...lists].sort(([a], [b]) => a.localeCompare(b)).map(([key, values]) => [key, values.length]));
  output.set("index.json", json({ schema_version: 2, note_count: entries.length,
    source_digest: digest.digest("hex"), topics: counts(topicLists), statuses: counts(statusLists),
    recent: "index/recent.json", entries: "index/entries/<two-character-shard-from-hit>.json",
    terms: "index/terms/<first-two-term-chars>.json" }));
  for (const [key, values] of entryShards) output.set(`index/entries/${key}.json`, json(values));
  for (const [key, values] of termShards) output.set(`index/terms/${key}.json`, json(Object.fromEntries(
    [...values].sort(([a], [b]) => a.localeCompare(b)))));
  for (const [key, values] of topicLists) output.set(`index/topics/${key}.json`, json(values));
  for (const [key, values] of statusLists) output.set(`index/status/${key}.json`, json(values));
  output.set("index/recent.json", json([...entries].sort((a, b) => b.updated.localeCompare(a.updated))
    .slice(0, 50)));

  // Reject oversized files before changing the existing index. GitHub's normal contents API reads up to 1 MB.
  for (const [path, value] of output) if (Buffer.byteLength(value) > 900_000) {
    throw new Error(`${path} exceeds 900 KB; split this index bucket before adding more notes`);
  }
  const indexDir = join(root, "index");
  const indexStat = await lstat(indexDir).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (indexStat && !indexStat.isDirectory()) throw new Error("index/ must be a directory");
  for (const path of ["index.json", "index/entries", "index/terms", "index/topics", "index/status"]) {
    const stat = await lstat(join(root, path)).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (stat && (stat.isSymbolicLink() || (path === "index.json" ? !stat.isFile() : !stat.isDirectory()))) {
      throw new Error(`${path} has an unsafe file type`);
    }
  }
  const existing = indexStat ? await markdownFiles(indexDir) : [];
  // Only generated JSON files inside index/ are owned by this script.
  const oldJson = async (dir: string): Promise<string[]> => {
    const paths: string[] = [];
    for (const item of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, item.name);
      if (item.isDirectory()) paths.push(...await oldJson(path));
      else if (item.isFile() && item.name.endsWith(".json")) paths.push(path);
    }
    return paths;
  };
  if (existing.length) throw new Error("index/ contains Markdown; move it before regenerating");
  const stale = indexStat ? await oldJson(indexDir) : [];
  for (const path of output.keys()) {
    const stat = await lstat(join(root, path)).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (stat && !stat.isFile()) throw new Error(`${path} has an unsafe file type`);
  }
  for (const [path, value] of output) {
    if (path === "index.json") continue;
    const target = join(root, path);
    await mkdir(resolve(target, ".."), { recursive: true });
    await writeFile(target, value);
  }
  for (const file of stale) if (!output.has(relative(root, file).split("\\").join("/"))) await rm(file);
  await writeFile(join(root, "index.json"), output.get("index.json")!);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  buildIndex(resolve(process.argv[2] ?? ".")).catch(error => { console.error(error); process.exitCode = 1; });
}
