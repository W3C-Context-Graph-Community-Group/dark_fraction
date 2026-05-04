# SCHEMA_ANALYSIS.md

Schema alignment analysis of `components/html/` code against `calculator/r/meta/schema.md`.

Files analyzed:

- `components/html/index.html`
- `cgp-html-forms-drag-and-drop.js`
- `cgp-runtime.js`
- `js/cgp/CgpUrlMap.js`
- `js/cgp/CgpFetchBackend.js`
- `js/cgp/CgpResolver.js`
- `js/cgp/cgp-known-paths.js`
- `js/cgp/ComponentTypeRegistry.js`
- `js/cgp/ComponentInstanceRegistry.js`
- `js/cgp/ComponentInstanceListView.js`
- `js/cgp/ComponentTypeListView.js`
- `js/cgp/conformance.js`
- `lib/event-bus/client.js`
- `cgp/core/html/forms/drag-and-drop.json`
- `cgp/root/events/observatron/activated.json`
- `cgp/root/events/observatron/state-change.json`
- `tests/demo/expected-page-load.json`
- `tests/demo/expected-post-drop.json`

---

## 1. Reference URL prefix: `r/` vs `root/` and `core/`

**Schema says:** All reference URLs live under `cgp:/r/`. Examples: `cgp:/r/keys/task.md`, `cgp:/r/components/html/forms/drag-and-drop.md`, `cgp:/r/events/activated.md`.

**Code does:** Uses `cgp:/root/` and `cgp:/core/` instead of `cgp:/r/`.

| Schema URL | Code URL |
|---|---|
| `cgp:/r/components/html/forms/drag-and-drop.md` | `cgp:/core/html/forms/drag-and-drop` |
| `cgp:/r/events/activated.md` | `cgp:/root/events/observatron/activated` |
| `cgp:/r/events/csv-dropped.md` | _(not present)_ |

**Affected files:**
- `cgp-html-forms-drag-and-drop.js:50,63` — `cgp:/root/events/...`, `cgp:/core/...`
- `cgp-runtime.js:86,93,102,114,126` — all channel URLs use `cgp:/root/...`
- `cgp-known-paths.js:7-9` — `root/events/...`, `core/...`
- `js/cgp/ComponentTypeRegistry.js:13` — filters on `cgp:/core/`
- `js/cgp/ComponentInstanceRegistry.js:19` — uses `cgp:/root/events/observatron/instance-registered`
- `cgp/core/html/forms/drag-and-drop.json` — filesystem path is `cgp/core/`, not `cgp/r/components/`
- `cgp/root/events/observatron/*.json` — filesystem path is `cgp/root/`, not `cgp/r/events/`

**Filesystem mirror is also wrong:** The on-disk directories are `cgp/core/` and `cgp/root/` instead of `cgp/r/components/` and `cgp/r/events/`.

---

## 2. URLs MUST carry file extensions

**Schema says:** "URLs MUST carry the file's extension explicitly. No default extension, no implicit format." Examples: `cgp:/r/keys/task.md`, `cgp:/r/events/activated.md`.

**Code does:** All CGP URLs are extension-free. `CgpUrlMap.js` silently appends `.json` on resolution.

| Schema URL | Code URL |
|---|---|
| `cgp:/r/components/html/forms/drag-and-drop.md` | `cgp:/core/html/forms/drag-and-drop` |
| `cgp:/r/events/activated.md` | `cgp:/root/events/observatron/activated` |

**Affected files:**
- `js/cgp/CgpUrlMap.js:42` — `return stripped + '.json'` (auto-appends extension)
- Every URL string throughout every file listed above

**Additionally:** Schema specifies `.md` files; code uses `.json` files.

---

## 3. `/meaning` column names: `key`/`value` vs `symbol`/`meaning`

**Schema says:** `/meaning` MUST have exactly two columns: `key` and `value`.

**Code does:** Uses columns named `symbol` and `meaning`.

Schema canonical example:
```json
{ "/meaning": { "key": ["Date"], "value": ["The trade execution date..."] } }
```

Code produces:
```json
{ "/meaning": { "symbol": ["cgp:/s/0/o/0"], "meaning": ["observatron"] } }
```

**Affected files:**
- `cgp-runtime.js:48` — `emptyFacets()` creates `{ "symbol": [], "meaning": [] }`
- `cgp-runtime.js:83,84,91,92,99,100,111,122,123` — all `.symbol` / `.meaning` writes
- `js/cgp/ComponentInstanceRegistry.js:17` — `{ "symbol": [...], "meaning": [...] }`
- `cgp/core/html/forms/drag-and-drop.json:10-11` — `"symbol"`, `"meaning"`
- `cgp/root/events/observatron/activated.json:7-8` — `"symbol"`, `"meaning"`
- `cgp/root/events/observatron/state-change.json:7-8` — `"symbol"`, `"meaning"`
- `tests/demo/expected-page-load.json` — all entries use `"symbol"` / `"meaning"`
- `tests/demo/expected-post-drop.json` — all entries use `"symbol"` / `"meaning"`
- `components/html/index.html:439` — reads `facets['/meaning']?.meaning?.[0]` (old name)

---

## 4. `/structure` column names: `key`/`value` vs `constraint-key`/`constraint-value`

**Schema says:** `/structure` MUST have exactly two columns: `key` and `value`. `key` names the schema language (e.g., `json-schema-2020-12`, `regex`). `value` carries the schema as a string.

**Code does:** Uses columns named `constraint-key` and `constraint-value`. Keys are data properties (e.g., `"format"`, `"bytes"`, `"type"`), not schema language names.

Schema canonical example:
```json
{ "/structure": { "key": ["json-schema-2020-12"], "value": ["<schema as string>"] } }
```

Code produces:
```json
{ "/structure": { "constraint-key": ["format","bytes","rows"], "constraint-value": ["csv",103,3] } }
```

**Affected files:**
- `cgp-runtime.js:112` — anchor `/structure` uses `constraint-key`/`constraint-value`
- `cgp-runtime.js:124` — path `/structure` uses `constraint-key`/`constraint-value`
- `js/cgp/ComponentInstanceRegistry.js:18` — `constraint-key`/`constraint-value`
- `js/cgp/ComponentTypeListView.js:4-5` — reads `constraint-key`/`constraint-value`
- `cgp/core/html/forms/drag-and-drop.json:14-15` — `constraint-key`/`constraint-value`
- `tests/demo/expected-post-drop.json` — all structure entries

**Content semantics also wrong:** The `key` column should hold schema language identifiers, not arbitrary property names. E.g., `"format"`, `"bytes"`, `"type"`, `"columnIndex"`, `"tag"`, `"display"` are all non-compliant keys.

---

## 5. Coupling rule: null facets on existing entries

**Schema says:** "When an entry exists, all four facets are present." and "There is no state in which an entry exists with null facets. If the facets would be null, the entry does not exist."

**Code does:** `emptyFacets()` initializes `/data` and `/structure` to `null`. System and observatron entries exist in state with null facets.

```js
// cgp-runtime.js:45-52
function emptyFacets() {
  return {
    "/data":      null,          // <-- violates coupling rule
    "/meaning":   { ... },
    "/structure": null,          // <-- violates coupling rule
    "/context":   { ... }
  };
}
```

**Affected files:**
- `cgp-runtime.js:45-52` — `emptyFacets()`
- `tests/demo/expected-page-load.json` — system and observatron have `/data: null`, `/structure: null`
- `tests/demo/expected-post-drop.json` — same

Per schema, `/data` should always be `{ "value": <payload> }` and `/structure` should be `{ "key": [], "value": [] }` when empty (not `null`).

---

## 6. Observatron `/data` should carry instantiation parameters

**Schema says:** "For an observatron, the boundary is instantiation. The payload is the instantiation parameters that brought the observatron into being." The canonical observatron example shows HTML attributes in `/data.value`.

```json
{ "/data": { "value": { "cgp-system-id": "0", "cgp-observatron-id": "0", "cgp-target": ".drop-zone", "cgp-intent": "{...}" } } }
```

**Code does:** Observatron `/data` is `null`. The HTML attributes are never captured into `/data`.

**Affected files:**
- `cgp-runtime.js:89-92` — observatron facets never set `/data`
- `cgp-html-forms-drag-and-drop.js:60-69` — attributes object is built but not passed to `createObservatron` for `/data`

---

## 7. Systems treated as graph entries

**Schema says:** "Systems (`cgp:/s/<id>`) are runtime scope, not entries on the graph. Only observatrons and spikes are entries."

**Code does:** Creates a full faceted entry for `cgp:/s/0` (system URL), stores it in state, emits it in `cgp-state-change`, and includes it in conformance test fixtures.

**Affected files:**
- `cgp-runtime.js:82-86` — creates system entry with facets
- `tests/demo/expected-page-load.json:2-33` — system entry in expected state
- `tests/demo/expected-post-drop.json:2-33` — system entry in expected state

---

## 8. `/context` mandatory first two rows (task + component-type) missing

**Schema says:** "The first two rows of `/context` MUST record the task and the component-type under which the entry was created." First row: `key = cgp:/r/keys/task.md`, `value = cgp:/r/tasks/<task-name>.md`. Second row: `key = cgp:/r/keys/component-type.md`, `value = cgp:/r/components/<component-name>.md`.

**Code does:** No entry has these mandatory rows. Instead:
- System context: `key: "systemId"`, `value: "0"`
- Observatron context: `key: "observatronId"`, `value: "0"`
- Event context: `key: "trigger"`, `value: "drop"`
- Anchor context: `key: "filename"`, `value: "<name>"`
- Path context: `key: "header"`, `value: "<header>"`

**Affected files:**
- `cgp-runtime.js:86,93,102,114,126` — all `appendContext` calls use bare strings
- `tests/demo/expected-page-load.json` — no task/component-type rows
- `tests/demo/expected-post-drop.json` — no task/component-type rows

---

## 9. `/context.key` should be `cgp:/r/keys/` URLs

**Schema says:** `key` column holds a `cgp:/r/keys/<key-name>.md` URL naming the property kind.

**Code does:** Uses bare strings: `"systemId"`, `"observatronId"`, `"trigger"`, `"filename"`, `"header"`, `"typeUrl"`.

**Affected files:**
- `cgp-runtime.js:86,93,102,114,126`
- `js/cgp/ComponentInstanceRegistry.js:19`
- `tests/demo/expected-page-load.json`
- `tests/demo/expected-post-drop.json`

---

## 10. `/context.channel` URLs wrong scheme

**Schema says:** Channel is a `cgp:/r/<path>` URL. Alpha events: `cgp:/r/events/activated.md`, `cgp:/r/events/csv-dropped.md`.

**Code uses:**
- `cgp:/root/events/observatron/activated` (wrong prefix, extra path segment, no `.md`)
- `cgp:/root/events/observatron/event-fired` (non-alpha event)
- `cgp:/root/events/observatron/anchor-minted` (non-alpha event)
- `cgp:/root/events/observatron/path-minted` (non-alpha event)
- `cgp:/root/events/observatron/instance-registered` (non-alpha event)

**Affected files:**
- `cgp-runtime.js:86,93,102,114,126`
- `js/cgp/ComponentInstanceRegistry.js:19`

---

## 11. Alpha defines exactly two events; code invents five more

**Schema says:** Alpha defines exactly two events: `cgp:/r/events/activated.md` and `cgp:/r/events/csv-dropped.md`. "No other events exist in alpha."

**Code invents:**
1. `event-fired` — used when mintEvent is called
2. `anchor-minted` — used when mintAnchor is called
3. `path-minted` — used when mintPath is called
4. `state-change` — used as a channel name / event-def URL
5. `instance-registered` — used in ComponentInstanceRegistry

**`csv-dropped` is entirely absent from the code.** Per schema, it is the minting event for spikes.

**Affected files:**
- `cgp-runtime.js:102,114,126`
- `cgp-html-forms-drag-and-drop.js:50`
- `js/cgp/ComponentInstanceRegistry.js:19`
- `cgp/root/events/observatron/state-change.json`

---

## 12. Missing `cgp-id` attribute on HTML element

**Schema Instantiation section shows:**
```html
<div cgp-id="cgp:/r/components/html/forms/drag-and-drop.md" ...>
```

The `cgp-id` attribute should appear on the element and cross the boundary verbatim into `/data.value`.

**Code does:** No `cgp-id` attribute is set on the custom element. The type URL is hardcoded:
```js
const typeUrl = 'cgp:/core/html/forms/drag-and-drop';  // line 63
```

**Affected files:**
- `cgp-html-forms-drag-and-drop.js:63` — hardcoded typeUrl
- `components/html/index.html:494-498` — element creation, no `cgp-id` set

---

## 13. Missing `cgp:/r/keys/` and `cgp:/r/tasks/` files

**Schema file structure shows:**
```
cgp/r/keys/task.md
cgp/r/keys/component-type.md
cgp/r/tasks/csv-dropped.md
cgp/r/components/html/forms/drag-and-drop.md
```

**On disk:** None of these files exist. The `cgp/r/` directory either doesn't exist or is missing these entries. The code never references these paths.

---

## 14. Missing JSON Schema validation files

**Schema says:** `observatron.schema.json` and `spike.schema.json` live at the repo root. The event bus validates every emission before broadcasting. Non-conformant emissions are rejected and logged.

**Code does:** No schema files exist at the repo root. The event bus (`lib/event-bus/client.js`) performs no validation — it is a raw WebSocket relay. The `cgp-state-change` DOM event dispatch in `cgp-runtime.js` also performs no validation.

**Affected files:**
- `lib/event-bus/client.js` — no validation logic
- `cgp-runtime.js:134-143` — `dispatchStateChange` emits without validation

---

## 15. Event nodes and anchor nodes are not schema entries

**Schema says:** Only observatrons and spikes are entries on the graph. The URL hierarchy `cgp:/s/<system>/o/<obs>/c/<channel>/<event>/a/<anchor>/p/<path>` — events (`/c/.../0`) and anchors (`/a/0`) are URL segments, but the schema's canonical examples only show observatrons and spikes (paths) as entries with four facets.

**Code does:** Creates full four-facet entries for event URLs (`cgp:/s/0/o/0/c/state-change/0`) and anchor URLs (`cgp:/s/0/o/0/c/state-change/0/a/0`). These are intermediate nodes the schema does not describe as graph entries.

**Affected files:**
- `cgp-runtime.js:96-103` — `mintEvent` creates a faceted entry
- `cgp-runtime.js:106-116` — `mintAnchor` creates a faceted entry
- `tests/demo/expected-post-drop.json:66-143` — event and anchor entries in expected state

---

## 16. Conformance test fixtures encode all the above violations

Both `tests/demo/expected-page-load.json` and `tests/demo/expected-post-drop.json` enshrine the non-compliant shapes as "expected":
- `null` facets
- `symbol`/`meaning` column names
- `constraint-key`/`constraint-value` column names
- System entry `cgp:/s/0` as a graph entry
- Bare-string `/context.key` values
- Non-alpha channel URLs
- Missing mandatory task/component-type rows

The `conformance.js` checker compares against these fixtures, so it validates conformance to the wrong spec.

---

## Summary Table

| # | Schema Rule | Status | Severity |
|---|---|---|---|
| 1 | Reference URLs under `cgp:/r/` | WRONG — uses `cgp:/root/`, `cgp:/core/` | High |
| 2 | URLs carry file extensions | WRONG — extension-free, auto-appended `.json` | High |
| 3 | `/meaning` columns `key`/`value` | WRONG — uses `symbol`/`meaning` | High |
| 4 | `/structure` columns `key`/`value` | WRONG — uses `constraint-key`/`constraint-value` | High |
| 5 | No null facets (coupling rule) | WRONG — `/data` and `/structure` are `null` | High |
| 6 | Observatron `/data` = instantiation params | WRONG — `/data` is `null` | High |
| 7 | Systems are not graph entries | WRONG — system gets full faceted entry | Medium |
| 8 | First two `/context` rows = task + component-type | WRONG — entirely absent | High |
| 9 | `/context.key` = `cgp:/r/keys/` URLs | WRONG — bare strings | High |
| 10 | `/context.channel` = `cgp:/r/` URLs | WRONG — `cgp:/root/` URLs, no extension | High |
| 11 | Alpha: exactly two events | WRONG — five extra, `csv-dropped` missing | High |
| 12 | `cgp-id` attribute on element | WRONG — missing | Medium |
| 13 | `r/keys/`, `r/tasks/` files exist | WRONG — missing | Medium |
| 14 | JSON Schema validation at emission | WRONG — no schema files, no validation | Medium |
| 15 | Only obs + spikes are entries | WRONG — event and anchor nodes too | Medium |
| 16 | Test fixtures match schema | WRONG — encode all violations | High |
