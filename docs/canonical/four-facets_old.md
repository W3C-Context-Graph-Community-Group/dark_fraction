# docs/canonical/four-facets.md

The locked alpha reference for what a four-facet entry looks like on the Context Graph. Anything that contradicts this document is wrong.

---

## Coupling Rule

An entry on the Context Graph (spike or observatron) exists if and only if a payload has crossed a boundary to bring it into being.

- For a **spike**: a datum crossing the observatron's boundary mints the spike.
- For an **observatron**: instantiation parameters crossing from the host (e.g., an HTML element) mint the observatron.

When an entry exists, all four facets are present. The shape is:

| Facet | When entry exists |
|---|---|
| `/data` | `{ "value": <payload> }` — the payload that minted the entry |
| `/meaning` | columnar table with `key` and `value` columns; rows may be empty or populated |
| `/structure` | columnar table with `key` and `value` columns; rows may be empty or populated |
| `/context` | columnar table with five columns; rows may be empty or populated |

There is no state in which an entry exists with `null` facets. If the facets would be null, the entry does not exist.

---

## Spikes: Four Facet Model Objects

### Facet #1 — Data

#### `/data`

`/data` carries whatever crossed the boundary as a payload. The wrapper shape is always `{ "value": <payload> }`, where `<payload>` is any JSON value (including empty values like `""`, `[]`, `{}`).

- For an observatron, the boundary is instantiation. The payload is the instantiation parameters that brought the observatron into being. Common shapes: HTML element attributes, an intent map, a configuration object.
- For a spike, the boundary is the observatron's watched interface. The payload is the datum that crossed it.
- One boundary event = one payload.
- Payload shape is unconstrained; `/structure` declares how it can be validated.

---

### Facet #2 — Meaning

#### `/meaning`

- MUST have exactly two columns: `key` and `value`.
- MUST contain only human-readable definitions.
- MAY have any number of rows: zero, one, or many.
- MUST NOT contain tags, schemas, or any other column.

**Example**

```json
{
  "/meaning": {
    "key": [
      "peanut butter",
      "chocolate",
      "peanut butter & chocolate"
    ],
    "value": [
      "A spread made from ground roasted peanuts.",
      "A confection made from cacao beans.",
      "A classic flavor pairing — the salty richness of peanut butter complements the sweetness of chocolate."
    ]
  }
}
```

This shape supports:

- A single term being defined (one row)
- Multiple unrelated terms in the same entry (many rows, no relationship)
- Atoms plus their composition (rows for parts, plus a row for the whole)

**Empty** (no definitions yet):

```json
{
  "/meaning": {
    "key": [],
    "value": []
  }
}
```

---

### Facet #3 — Structure

#### `/structure`

- MUST have exactly two columns: `key` and `value`.
- `key` names the schema language (e.g., `json-schema-2020-12`, `regex`).
- `value` carries the schema itself (as a string or object — the form native to that schema language).
- MAY have any number of rows: zero, one, or many. Multiple rows = multiple schemas (in different languages) all validating the same `/data`.
- MUST NOT contain configuration, descriptions, or runtime behavior.

#### Examples

**JSON Schema**
```json
{
  "/structure": {
    "key": ["json-schema-2020-12"],
    "value": ["<schema as string>"]
  }
}
```

**Regex**
```json
{
  "/structure": {
    "key": ["regex"],
    "value": ["^[0-9]{4}-[0-9]{2}-[0-9]{2}$"]
  }
}
```

**Empty** (no constraints declared):

```json
{
  "/structure": {
    "key": [],
    "value": []
  }
}
```

---

### Facet #4 — Context

#### `/context`

- MUST have exactly five columns: `anchor`, `channel`, `timestamp`, `key`, `value`.
- All five columns are parallel arrays of equal length.
- MUST be a time-ordered log of events.
- MUST NOT contain configuration, schemas, or human-readable descriptions outside the event log.

**Column definitions**

| Column | Holds |
|---|---|
| `anchor` | URL of the entry this row is about. Invariant across all rows of one entry. |
| `channel` | A `cgp:/t/<tag>` string naming the kind of event. |
| `timestamp` | ISO 8601 UTC, millisecond precision. |
| `key` | What is being asserted. |
| `value` | The asserted content (literal or `cgp:/t/<tag>` reference). |

Read row N as a sentence: *at `timestamp[N]`, the entry at `anchor[N]` had `key[N]` = `value[N]`, as a claim of kind `channel[N]`.*

**Example**

```json
{
  "/context": {
    "anchor": ["cgp:/s/0/o/0/c/state-change/0/a/0/p/0"],
    "channel": ["cgp:/t/spike-formed"],
    "timestamp": ["2026-05-02T13:23:24.034Z"],
    "key": ["spike"],
    "value": ["cgp:/s/0/o/0/c/state-change/0/a/0/p/0"]
  }
}
```

**Empty** (no events recorded yet):

```json
{
  "/context": {
    "anchor": [],
    "channel": [],
    "timestamp": [],
    "key": [],
    "value": []
  }
}
```

**Note on `source`:** A sixth column `source` (the URL of the observatron emitting the row) is reserved for beta when cross-observatron observation is supported. In alpha, source is always the observatron whose graph this is, so the column is omitted.

---

## Canonical Complete Spike

A complete, minimal spike with all four facets populated. This is the reference shape every implementer should validate against.

```json
{
  "/data": {
    "value": ["2026-01-15", "2026-01-16", "2026-01-17"]
  },
  "/meaning": {
    "key": ["Date"],
    "value": ["The trade execution date in ISO format."]
  },
  "/structure": {
    "key": ["json-schema-2020-12"],
    "value": ["{\"type\":\"array\",\"items\":{\"type\":\"string\",\"format\":\"date\"}}"]
  },
  "/context": {
    "anchor": ["cgp:/s/0/o/0/c/state-change/0/a/0/p/0"],
    "channel": ["cgp:/t/spike-formed"],
    "timestamp": ["2026-05-02T13:23:24.034Z"],
    "key": ["header"],
    "value": ["Date"]
  }
}
```

This spike represents a single CSV column ("Date") that crossed a drag-and-drop boundary.

---

## Canonical Complete Observatron

An observatron minted when an HTML element instantiates it. The instantiation parameters are the payload.

```json
{
  "/data": {
    "value": {
      "system-id": "0",
      "observatron-id": "0",
      "cgp-target": ".drop-zone"
    }
  },
  "/meaning": {
    "key": ["watches CSV columns"],
    "value": ["Observes drag-and-drop CSV files and emits one spike per column."]
  },
  "/structure": {
    "key": [],
    "value": []
  },
  "/context": {
    "anchor": ["cgp:/s/0/o/0"],
    "channel": ["cgp:/t/activated"],
    "timestamp": ["2026-05-02T13:22:55.774Z"],
    "key": ["component"],
    "value": ["cgp:/t/html-forms-drag-and-drop"]
  }
}
```

The observatron exists because instantiation parameters crossed the boundary. `/data` carries those parameters. `/meaning` describes what the observatron does in human terms. `/structure` is empty because no schema for instantiation parameters has been declared. `/context` records the activation event.

## Instantiation

### System 

```html
<cgp-html-forms-drag-and-drop
  cgp-system-id="0"
  cgp-observatron-id="0"
  cgp-target=".drop-zone"
  cgp-intent-map="{...}">
</cgp-html-forms-drag-and-drop>
```

```json
{
  "/data": {
    "value": {
      "system-id": "0",
      "observatron-id": "0",
      "cgp-target": ".drop-zone",
      "cgp-intent-map": {"...":"..."}
    }
  }
}
```

### Observatron


```json
{
  "/data": {
    "value": {      
      "intent map keys":"intent map values"
    }
  }
}
```

### Spike