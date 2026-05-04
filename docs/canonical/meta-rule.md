<!-- meta-rule.md -->

This document defines how `/r/` reference files are written so that URLs resolve consistently across implementations, hosts, and renderers. Every reference catalog (`keys/`, `tasks/`, `components/`, `events/`, etc.) MUST follow these rules.

The rules exist for one reason: **provenance must be unambiguous.** A `/context` row carrying `cgp:/r/keys/task.md` must resolve to exactly one place, with no host-dependent or renderer-dependent interpretation. The rules below are what guarantee that.

Entries below are alphabetical.

---

# literal-resolution

**Reference URL:** `cgp:/r/meta-rule/literal-resolution.md`

A `cgp:/r/<path>` URL resolves literally:

1. Strip the `cgp:/r/` prefix.
2. Fetch the rest as a file path on the implementation's host.

That is the entire rule. No fragment handling, no defaulting, no transformation, no format inference. The URL is exactly the file path.

## Examples

| URL | File served |
|---|---|
| `cgp:/r/keys/task.md` | `/keys/task.md` |
| `cgp:/r/components/html-forms-drag-and-drop.md` | `/components/html-forms-drag-and-drop.md` |
| `cgp:/r/policy.json` | `/policy.json` |
| `cgp:/r/diagram.svg` | `/diagram.svg` |

## Why

Literal resolution removes every form of URL-to-file ambiguity. Works on GitHub, GitLab, S3, raw filesystem — anything that serves static files. No dependency on slugifiers, route maps, or extension defaults.

---

# one-file-per-entry

**Reference URL:** `cgp:/r/meta-rule/one-file-per-entry.md`

Each catalog entry is its own file. Catalog "documents" are directories of entry files, not single files containing many entries.

## Layout

```
keys/
  README.md                    ← optional intro prose
  task.md                      ← cgp:/r/keys/task.md
  component-type.md            ← cgp:/r/keys/component-type.md

tasks/
  README.md
  csv-dropped.md               ← cgp:/r/tasks/csv-dropped.md

components/
  README.md
  html-forms-drag-and-drop.md  ← cgp:/r/components/html-forms-drag-and-drop.md
```

## Adding an entry

Add a new file `<entry-name>.md` to the appropriate catalog directory. The filename (without extension) is the entry name. The directory listing is the registry.

## Why

URL fragments depend on a renderer's slugifier (`# Task` → `id="task"` on GitHub, but rules vary across renderers). Eliminating fragments means eliminating that dependency. One entry per file, addressed by its full path, fetched literally — no slugification involved at any step.

It also makes adding entries a pure-append operation: a new file, no editing of existing content, no risk of fragment collision, separate diff and review history per entry.

---

# url-carries-extension

**Reference URL:** `cgp:/r/meta-rule/url-carries-extension.md`

URLs MUST carry the file's extension explicitly. There is no default extension, no implicit format.

## Correct

```
cgp:/r/keys/task.md
cgp:/r/components/html-forms-drag-and-drop.md
cgp:/r/policy.json
cgp:/r/diagram.svg
```

## Incorrect

```
cgp:/r/keys/task
cgp:/r/components/html-forms-drag-and-drop
```

## Why

Without explicit extensions, the protocol would need to commit to a default format (e.g., "assume `.md`") and a rule for overriding it. Both add complexity. Explicit extensions make every URL self-contained: a reader knows the file format from the URL alone, and the host serves it without any path rewriting.
