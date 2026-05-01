# Drag and Drop Component test for /demo

## Test 1 — PAGE LOAD (Handshake)

View `tests/demo/expected-page-load.json` for the expected "handshake" when cgp is instantiated on an html element.

### The CGP Handshake in HTML

The following component delivers html syntax bindings to the Context Graph Protocol (cgp).

- html attributes are mappable back to url encoding structures used by context anchors.

This is the element that matches the expected json at `tests/demo/expected-page-load.json`

```html
<cgp-html-forms-drag-and-drop
  cgp-target=".drop-zone"
  cgp-system-id="0"
  cgp-observatron-id="0">
  <div class="drop-zone">...</div>
</cgp-html-forms-drag-and-drop>
```

### Pass/Fail criteria

- **PASS**: Runtime state after instantiation contains exactly the two URL entries (`cgp:/s/0`, `cgp:/s/0/o/0`) with matching `/data`, `/meaning`, `/structure`, and `/context` facets (timestamps excluded).
- **FAIL**: Any missing URL, missing facet, or mismatched value.

## Test 2 — POST DROP (CSV ingestion)

### The CSV file

`tests/demo/sales.csv` contains our test CSV data.

`tests/demo/expected-post-drop.json` contains the full JSON state expected after dropping the CSV onto the component.

### Pass/Fail criteria

- **PASS**: Runtime state after CSV drop contains all URL entries from the expected fixture, with matching facet values (timestamps excluded).
- **FAIL**: Any missing URL, missing facet, or mismatched value.

## Conformance panel

The `/demo` page includes a self-verifying conformance panel below the JSON viewer. Two assertion rows:

1. **PAGE LOAD** — checked on first `cgp-state-change` event; compares against `expected-page-load.json`.
2. **POST DROP** — checked on second+ `cgp-state-change` events; compares against `expected-post-drop.json`.

Each row shows: ✓ (green) on pass, ✗ (red) on fail with a "show diff" link revealing mismatches.
