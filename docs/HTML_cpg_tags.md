# The Canonical CGP Tag

This is the recommended HTML tag form for CGP components, finalized for
the v1 MVP shipping in June. Use this form in all documentation,
demos, and toolkit examples.

---

## The Canonical Tag

```html
<cgp-html-forms-drag-and-drop cgp-target="#my-elem">
  <div id="my-elem" />
</cgp-html-forms-drag-and-drop>
```

Three lines. One CGP attribute. One inner element. This is the full
hello-world form a developer needs to instrument an HTML boundary with
the Context Graph Protocol.

---

## What Each Piece Is Doing

### The element name: `cgp-html-forms-drag-and-drop`

Four segments, each carrying specific meaning in the type path:

| Segment | Meaning |
|---|---|
| `cgp-` | Namespace. Declares this element participates in the Context Graph Protocol — same role `cgp:/` plays in URLs. |
| `html-` | Syntax kind. This component instruments HTML. |
| `forms-` | Library. Component lives in the `forms` library within `core/html`. |
| `drag-and-drop` | Component identifier. The leaf name of the specific component. |

This name resolves to the type URL
`cgp:/root/components/core/html/forms/drag-and-drop` and globally
identifies what kind of component this is. Component names must not
collide across implementations — a Python observatron and a JavaScript
observatron cannot ship a `drag-and-drop` component under the same
type path unless they declare the same protocol-level entity.

### The attribute: `cgp-target="#my-elem"`

The only required attribute on the canonical tag. A CSS selector
pointing at the inner element to instrument. Everything else (system
ID, observatron ID, channel) is auto-assigned by the runtime.

The `cgp-` prefix on the attribute is deliberate: it signals that the
attribute is part of the CGP protocol contract, not an HTML standard
attribute or another library's convention.

### The inner element: `<div id="my-elem" />`

Non-CGP content. This is what gets observed. The CGP tag wraps it as
an instrumented boundary. The inner element can be any HTML —
`<div>`, `<form>`, `<table>`, `<textarea>`, etc. The CGP tag does not
care what shape the inner content takes; it cares that there is a
boundary it can observe.

CGP elements wrap non-CGP content. CGP elements do not contain other
CGP elements. (See the *Flat Element Structure* rule in the main spec.)

---

## What's Deliberately Not in the Tag

**`cgp-system-id` and `cgp-observatron-id`** — auto-assigned by default.
The runtime mints `cgp:/s/0` for the page and `cgp:/s/0/o/1` for this
instance. Specify them only when stable IDs matter (testing, backend
integration, deterministic URL generation).

**`cgp-filetype`** — the MVP drag-and-drop component infers file type
from dropped content. The attribute is reserved for a v2 hint
mechanism when components support more than CSV.

**`cgp-channel`** — defaults to the `state-change` channel for this
component. Override is a v2 concern.

The minimum-viable CGP element is one tag with one attribute. That is
the design target.

---

## When to Add Explicit Attributes

### Default — auto-assigned, minimum boilerplate

```html
<cgp-html-forms-drag-and-drop cgp-target="#my-elem">
  <div id="my-elem" />
</cgp-html-forms-drag-and-drop>
```

### Multiple components on a page — auto-increment

```html
<cgp-html-forms-drag-and-drop cgp-target="#zone-a">
  <div id="zone-a" />
</cgp-html-forms-drag-and-drop>

<cgp-html-forms-drag-and-drop cgp-target="#zone-b">
  <div id="zone-b" />
</cgp-html-forms-drag-and-drop>
```

The runtime assigns `cgp:/s/0/o/1` and `cgp:/s/0/o/2` automatically,
in DOM order.

### Explicit IDs — testing, backend integration, deterministic URLs

```html
<cgp-html-forms-drag-and-drop
    cgp-system-id="0"
    cgp-observatron-id="1"
    cgp-target="#my-elem">
  <div id="my-elem" />
</cgp-html-forms-drag-and-drop>
```

---

## URLs This Tag Produces

For the canonical tag, the runtime mints these URLs at page load:

```
cgp:/s/0                — the system (page scope)
cgp:/s/0/o/1            — the observatron (this component instance)
```

After a CSV is dropped onto the inner element:

```
cgp:/s/0/o/1/c/state-change/0           — the event
cgp:/s/0/o/1/c/state-change/0/a/0       — the anchor (the file)
cgp:/s/0/o/1/c/state-change/0/a/0/p/0   — first column (path)
cgp:/s/0/o/1/c/state-change/0/a/0/p/1   — second column
cgp:/s/0/o/1/c/state-change/0/a/0/p/2   — third column
```

Each URL has the standard four facets (`/data`, `/meaning`,
`/structure`, `/context`). The full state is emitted on the
`cgp-state-change` event.

---

## The Teaching Annotation

For documentation, slide decks, and the toolkit README, the canonical
tag annotates cleanly with five labeled parts:

```
<cgp-html-forms-drag-and-drop cgp-target="#my-elem">
  ↑   ↑    ↑     ↑             ↑
  ns  syn  lib   component      inner element selector

  <div id="my-elem" />          ← any HTML you want observed

</cgp-html-forms-drag-and-drop>
```

Five teaching points visible on three lines. No paragraph of explanation
required underneath.

---

## Full Hello-World

The complete minimum working example, including module load and event
listener:

```html
<script type="module" src="./cgp-html-forms-drag-and-drop.js"></script>

<cgp-html-forms-drag-and-drop cgp-target="#my-elem">
  <div id="my-elem">Drop a CSV here</div>
</cgp-html-forms-drag-and-drop>

<script>
  document.addEventListener("cgp-state-change", (e) => {
    console.log(e.detail.state);
  });
</script>
```

Import the component, wrap an element with one attribute, listen for
state changes. Six lines of HTML and one line of JavaScript.

This is the tag to ship in June.