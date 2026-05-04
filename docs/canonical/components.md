# Components

Catalog of components that can spawn observatrons. Each component is referenced from `/context` as `cgp:/r/components#<component-name>` and resolves (per the resolution rule) to its anchor in this document.

H2 sections group related components by environment or library. H3 sections define individual components.

---

## HTML Forms

### html-forms-drag-and-drop

**Reference URL:** `cgp:/r/components#html-forms-drag-and-drop`

A custom HTML element that wraps a drop-target region. When the host page declares it, an observatron is minted. When a CSV is dropped on the target, the observatron mints one spike per column.

**HTML form:**

```html
<cgp-html-forms-drag-and-drop
  cgp-system-id="0"
  cgp-observatron-id="0"
  cgp-target=".drop-zone"
  cgp-intent="{...}">
</cgp-html-forms-drag-and-drop>
```

**Attributes:**

| Attribute | Required | Purpose |
|---|---|---|
| `cgp-system-id` | yes | Identifier for the system scope (auto-assigned if absent). |
| `cgp-observatron-id` | yes | Identifier for the observatron within the system (auto-assigned if absent). |
| `cgp-target` | yes | CSS selector identifying the inner drop-target element. |
| `cgp-intent` | yes | JSON-encoded intent map describing what the observatron watches for and how. Recorded verbatim in `/data` per the No-Parsing Rule. |

**On instantiation:**
- The attribute set crosses the boundary verbatim and becomes the observatron's `/data`.
- The observatron's first `/context` row records the task (`cgp:/r/tasks#csv-dropped`) and component-type (`cgp:/r/components#html-forms-drag-and-drop`) under the `cgp:/r/events#activated` channel.

**On drop:**
- For each column in the dropped CSV, a spike is minted under the observatron.
- Each spike's `/data` carries the column's values, recorded verbatim as strings.
- Each spike's first `/context` row records the same task and component-type under the `cgp:/r/events#csv-dropped` channel.

This is the only component defined in alpha.
