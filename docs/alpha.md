# Context Graph Protocol — Release Alpha

This document specifies the minimum the protocol commits to. Anything not stated here is open. "Alpha" reflects that scope: ship the structural guarantees δ depends on, defer everything else.

---

## What is on the Context Graph

The Context Graph contains exactly two kinds of entry:

**Observatrons (nodes).** A node stationed at a boundary. Configured by an intent map. Watches data crossing the boundary and produces spikes when watched concepts appear.

**Spikes.** Four-facet representations of a datum that crossed a boundary. Spikes form on observatrons when the intent map matches.

Every observatron and every spike has a URL and four facets.

## What is not on the Context Graph

**Systems.** A runtime scope (`cgp:/s/<id>`) under which one or more observatrons live. The system is a namespace, like a directory. It has no facets, no observational role, and is not an entry in the graph.

**HTML components, libraries, source files, documentation.** External. These live in code repositories, docs, package managers — outside the protocol. They are referenced by tag when needed.

**Tags.** Strings observatrons use to name things consistently — task identities, channel kinds, provenance pointers. The protocol uses tags but does not own them.

---

## Two namespaces

CGP uses exactly two URL namespaces.

**`cgp:/s/...` — System.** The runtime scope under which observatrons and spikes are addressed. URLs under `/s/` that resolve to entries on the graph (observatrons and spikes) have four facets. The system URL itself is a scope, not an entry.

**`cgp:/t/...` — Tag.** A flat string namespace. A tag is a label observatrons use to name things consistently. Tags are not required to dereference to anything. The protocol does not specify what, if anything, a tag resolves to. How an implementer documents the meaning of a tag — a JSON catalog, a wiki, a markdown file, nothing at all — is outside the protocol.

The internal/external split: internal (entries on the graph) gets four-facet symmetry. External (tags, components, docs) is just labels and pointers, intentionally outside the protocol's structural commitments.

---

## URL pattern

```
cgp:/s/<system>/o/<observatron>/c/<channel>/<event-n>/a/<anchor-n>/p/<path-n>
```

| Slot | Identifier | Source |
|---|---|---|
| `s` | system | user-supplied or auto-assigned integer (scope, not on graph) |
| `o` | observatron | user-supplied or auto-assigned integer (node, on graph) |
| `c` | channel | the leaf of a `/t/` tag |
| (after channel) | event-n | auto-incremented per channel per observatron, starting at 0 |
| `a` | anchor-n | auto-incremented per event, starting at 0 |
| `p` | path-n | auto-incremented per anchor, starting at 0 |

The shortest URL that addresses an entry on the graph is `cgp:/s/<system>/o/<observatron>` (an observatron). Anything deeper is a spike.

---

## The four-facet rule

Every entry on the Context Graph has exactly four top-level keys:

```
/data
/meaning
/structure
/context
```

No other top-level keys. This is the only structural guarantee the protocol makes.

The four labels are the same for observatrons and spikes. The contents differ.

---

## Observatron facets

An observatron is a **typed, named I/O block.** It has:

- a name and purpose (`/meaning`)
- a typed interface (`/structure` as JSON Schema for I/O)
- a configuration (`/data` = intent map)
- a history (`/context`)

| Facet | Content |
|---|---|
| `/data` | The intent map. The configuration that defines what the observatron watches for. Its internal shape is implementer-defined. |
| `/meaning` | The task. A `/t/` tag naming what this observatron is for in domain terms. Two observatrons with the same task tag are the same kind of instrument. |
| `/structure` | The I/O schema for this observatron, expressed as JSON Schema. What enters the boundary, what produces spikes, what shape they have. |
| `/context` | Time-ordered log of events on the observatron: activated, spawned by component, spike formed, etc. |

### Provenance lives in /context

Provenance — *who or what spawned this observatron* — is an event with a timestamp. It belongs in `/context`, not in `/meaning`. Example row:

```
anchor:    cgp:/s/0/o/0
source:    cgp:/s/0/o/0
channel:   cgp:/t/spawned-by
timestamp: 2026-05-02T00:44:00.192Z
key:       component
value:     cgp:/t/html-forms-drag-and-drop
```

The component is a tag. The protocol doesn't care what (if anything) is behind the tag — a file path, a git URL, a doc, nothing.

---

## Spike facets

A spike is a four-facet representation of a datum that crossed the boundary and matched the observatron's intent map.

| Facet | Content |
|---|---|
| `/data` | The datum. The actual value or values that crossed the boundary. Single-row when present. |
| `/meaning` | What the datum refers to. A `/t/` tag (e.g., the column name, the field semantic, the matched concept). |
| `/structure` | The constraints the datum satisfies. JSON Schema for the datum's shape. |
| `/context` | Time-ordered log of events on the spike: minted, observed, verified, etc. |

### Spikes are what δ measures

For a boundary with m spikes, the configuration space is `{0,1}^(3m)` with `2^(3m)` configurations. With r facets verified, the verified region is the Hamming ball of radius r:

```
δ = 1 − |B_r| / 2^(3m)
|B_r| = Σ_{k=0..r} C(3m, k)
```

δ is the protocol's coherence metric. m counts spikes; n = 3m counts the verifiable facets across those spikes (`/meaning`, `/structure`, `/context`); r counts how many of those facets have been verified.

`/data` is the datum that crossed the boundary; the other three describe it. δ measures coherence over the descriptive facets of the spike store.

---

## Facet shapes

**`/data`** — Either `null` (no payload) or `{ value: [<single-row payload>] }`. Single-row when present.

**`/meaning`** — Columnar store. At minimum: `symbol` and `meaning`, two parallel arrays of equal length.

**`/structure`** — Either `null` (when `/data` is null) or columnar with `constraint-key` and `constraint-value`, two parallel arrays of equal length, expressed as JSON Schema constraints.

**`/context`** — Columnar with six parallel arrays of equal length:

| Column | Holds |
|---|---|
| `anchor` | URL of the entry this row is about (invariant across all rows of one entry) |
| `source` | URL of the observatron that emitted the row |
| `channel` | a `/t/` tag naming the kind of event |
| `timestamp` | ISO 8601 UTC, millisecond precision |
| `key` | path within the facet being asserted about |
| `value` | the asserted value (literal or URL or tag) |

All arrays inside one facet have equal length. Row N of any facet is element N of every column.

---

## The intent map

An observatron has an intent map. The intent map defines what the observatron watches for. When data crosses the boundary and matches a rule in the intent map, a spike forms.

The internal structure of an intent map is **implementer-defined.** A drag-and-drop component might have an intent map that says "emit one spike per CSV column." A form-input component might have one that says "match this regex; classify as block/warning/info." A SQL slot might have one that says "spike on each query parameter."

The protocol's only requirement: the observatron's `/data` carries the intent map, and the observatron emits spikes consistent with it.

---

## MVP runtime

A drag-and-drop component instantiates one observatron on page load. Its intent map says: *watch for columns in dropped CSVs; emit one spike per column.*

Tags used:

- `cgp:/t/activated` — observatron activation event
- `cgp:/t/spawned-by` — provenance event
- `cgp:/t/state-change` — drop event channel
- `cgp:/t/column` — task tag for column spikes
- `cgp:/t/html-forms-drag-and-drop` — component identity tag

Each is a flat string under `/t`. The protocol requires only that observatrons use the same tag consistently when they want their observations to be matchable.

### On page load

The observatron mints itself. Its four facets:

- `/data` — the intent map (e.g., `{ value: [{ "watches": "csv-columns" }] }` — exact shape is the component's choice)
- `/meaning` — `{ symbol: ["task"], meaning: ["cgp:/t/watches-csv-columns"] }`
- `/structure` — JSON Schema describing the I/O: input is a CSV file, output is one spike per column
- `/context` — two rows: activation, and spawned-by-component

The graph store after page load contains exactly one entry: the observatron at `cgp:/s/0/o/0`.

### Drop sequence

1. The drop event arrives at the boundary.
2. The intent map matches each column header. For each column (sorted by columnIndex):
   - Mint a spike at `cgp:/s/0/o/0/c/state-change/0/a/0/p/<k>`.
   - `/data` = `{ value: [<column values as array>] }`
   - `/meaning` = `{ symbol: ["header"], meaning: [<column header>] }`
   - `/structure` = JSON Schema for the column (type, columnIndex, etc.)
   - `/context` = one row recording the spike's formation, with channel `cgp:/t/state-change`.
3. Append rows to the observatron's `/context` recording each spike formation.
4. Dispatch DOM event `cgp-state-change` with `{ event: "cgp:/t/state-change", state: <full graph store> }`.

---

## Acceptance criteria

**On page load.** The graph store contains exactly one entry: the observatron at `cgp:/s/0/o/0`. It has four facets, all populated as described above.

**After dropping sales.csv** (3 columns, 3 rows). The graph store contains exactly four entries: the observatron, plus three column spikes. m = 3 (three spikes), n = 9, r = 0 (no facets verified yet), δ = 1 − 1/512 ≈ 99.8%.

**After dropping the same file twice.** The graph store contains seven entries: the observatron, three spikes from the first drop, three spikes from the second drop. The event counter has incremented from 0 to 1 in the URLs of the second batch. The observatron's `/context` has additional rows for the second drop.

A `cgp-state-change` CustomEvent fires exactly once per drop.

---

## Out of scope for alpha

- The internal shape of intent maps
- The internal shape, storage, or documentation of `/t` tags
- HTML element naming conventions
- Claim log materialization (claims are a view over the graph, not yet specified)
- δ computation inside the runtime (the calculator is a separate surface)
- Verification semantics (what makes a facet "verified" is not yet specified for the single-system case)
- FMR, reification, formula execution traces
- Multiple observatrons per page
- Persistence across reloads
- Workflow chaining of observatrons by I/O schema

These are open questions. Release alpha ships only what's required for the Context Graph to contain valid observatrons and spikes, and for δ to be computable over the spike store.

---

## Summary

> **The Context Graph contains observatrons (nodes) and spikes. Both have four facets:**
> - **`/data`** — intent map (observatron) or datum (spike)
> - **`/meaning`** — task tag (observatron) or referent tag (spike)
> - **`/structure`** — I/O JSON Schema (observatron) or datum constraints (spike)
> - **`/context`** — time-ordered event log
>
> **Systems are runtime scope, off graph. Tags are external strings, no shape commitment. δ is computed over the spike store.**

That is the entire alpha commitment.