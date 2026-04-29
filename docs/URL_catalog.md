# The URL Catalog

Everything addressable in the Context Graph Protocol lives at a URL
with four facets. This includes user-minted nodes (observatrons,
events, anchors, paths) *and* the protocol's own self-description
(channels, components, libraries, tasks, operations, formulas).

This document describes the catalog of URLs the protocol exposes — how
the namespaces are organized, where each kind of URL lives, and how
runtimes consume them. The principle: **same shape at every scale,
applied to the protocol's own libraries.**

---

## Two Layers of URLs

The catalog has two layers, distinguished by what they describe:

| Layer | What it answers | Where it lives | When it changes |
|---|---|---|---|
| **Type-level** | *What kinds of things exist?* What components ship with the protocol, what tasks they perform, what HTML elements they can wrap, what channels they fire on. | `cgp:/root/...` and `cgp:/core/...` | When libraries are updated or new ones are released. |
| **Instance-level** | *What specific things are happening right now?* This page's observatrons, the events firing through them, the anchors and paths being minted. | `cgp:/s/<id>/...` | Continuously, as users interact. |

The distinction is structural, not technical. Both layers use the same
four-facet shape, the same URL grammar, the same runtime APIs. They
live side-by-side in the same flat URL-keyed state object. UIs render
them in separate visual groups because that's useful for humans, not
because the protocol distinguishes them.

---

## Reserved Namespaces

Two top-level segments are reserved for protocol-level use:

### `cgp:/root/` — protocol self-description

Things that are part of the protocol itself, not part of any specific
library:

| URL prefix | Contents |
|---|---|
| `cgp:/root/events/` | Channel definitions. Each channel is a URL declaring what kind of events flow through it. |
| `cgp:/root/ops/` | Primitive operations (`divide`, `subtract`, `compare`, etc.). Each is a spike at its URL. |
| `cgp:/root/formulas/` | Protocol formulas (e.g., `dark-fraction`, `full-memory-recurrence`). Each is a spike at its URL. |

### `cgp:/core/` — canonical first-party library

The reference library of components and supporting catalogs that ships
with the protocol. Third-party libraries claim their own top-level
namespaces (`cgp:/<other-org>/...`) under the same conventions.

| URL prefix | Contents |
|---|---|
| `cgp:/core/html/elements/` | Wrappable HTML element kinds (`textarea`, `div`, `table`, etc.). |
| `cgp:/core/html/forms/` | CGP form components (`drag-and-drop`, `text-input`, etc.). |
| `cgp:/core/html/tasks/` | Tasks that components can perform (`file-upload`, `row-edit`, etc.). |

User-minted URLs always live under `cgp:/s/<system-id>/...` and never
collide with reserved namespaces.

---

## The Four Catalogs

The MVP ships four catalogs. Each is a registry URL whose `/data`
facet lists the URLs it contains.

### 1. Wrappable HTML element kinds

```
cgp:/core/html/elements
  /data: ["textarea", "div", "table", "form", "input", ...]
```

Each member URL (e.g., `cgp:/core/html/elements/textarea`) is itself a
spike with four facets describing what the HTML element is and how it
behaves.

### 2. CGP web components

```
cgp:/core/html/forms
  /data: ["drag-and-drop", "text-input", "multi-select", ...]
```

Each member URL (e.g., `cgp:/core/html/forms/drag-and-drop`) is the
component definition with four facets, including the
`<cgp-html-forms-drag-and-drop>` element it ships and what it does at
runtime.

### 3. Wrapping compatibility map

The compatibility map *is not its own URL*. It lives inside each
component's `/structure` facet as a relationship to other catalog URLs:

```
cgp:/core/html/forms/drag-and-drop
  /structure:
    applies-to: ["cgp:/core/html/elements/textarea",
                 "cgp:/core/html/elements/div"]
    performs:   ["cgp:/core/html/tasks/file-upload"]
```

A component declares what it can wrap (`applies-to`) and what tasks it
performs (`performs`) by referencing other catalog URLs. The
relationships are walkable: a UI showing the drag-and-drop component
can dereference each `applies-to` URL to display the wrappable
elements, and dereference each `performs` URL to display the tasks.

### 4. Tasks

```
cgp:/core/html/tasks
  /data: ["file-upload", "row-edit", "field-validation", ...]
```

Each member URL (e.g., `cgp:/core/html/tasks/file-upload`) is a spike
describing what the task means and what its inputs and outputs are.

### A note on channels

Channel definitions live in `cgp:/root/events/` rather than
`cgp:/core/`, because they are protocol-level, not library-level. A
channel is part of the protocol's own grammar (what kinds of claims
can flow through the network); a component is a library-supplied
artifact that emits and receives those claims. Different scope, different
namespace.

---

## Catalogs Are Themselves Spikes

Each catalog URL (e.g., `cgp:/core/html/forms`) is itself a
URL-addressable spike with four facets. That means the catalogs are
walkable using the same protocol the rest of the graph uses. There is
no special "catalog protocol" — there is only the URL graph, and some
URLs happen to enumerate other URLs in their `/data`.

This recursion is the property worth committing to: the protocol
describes its own libraries using the same machinery libraries use to
describe user data.

---

## Channels Are URLs

The "event bus" is the runtime's local binding of channel URLs to a
delivery mechanism. The channels themselves are URLs at
`cgp:/root/events/...`. When a JavaScript-in-a-browser runtime writes:

```js
document.addEventListener('cgp-state-change', ...)
```

it is subscribing to the channel
`cgp:/root/events/observatron/state-change` via the DOM-event binding.
Other runtimes bind the same channel URL to other mechanisms — Python
might use asyncio queues, distributed systems might use
WebSocket or pub/sub.

The channel URL is the protocol contract. The bus is the local
implementation.

This means **subscribing to data is a URL operation**, not a different
kind of operation. A consumer in the left panel of the UI subscribes
to a channel URL by whatever mechanism the local runtime provides; the
URL is what makes the subscription portable across implementations.

---

## Static Catalog Load vs. Live State

Runtimes consume the URL graph in two phases:

### Static catalog load (once at startup)

The runtime fetches each catalog file from local storage. The MVP ships
these as JSON files at known paths:

```
/events/state-change.json                       → cgp:/root/events/observatron/state-change
/components/core/html/elements.json             → cgp:/core/html/elements
/components/core/html/forms.json                → cgp:/core/html/forms
/components/core/html/forms/drag-and-drop.json  → cgp:/core/html/forms/drag-and-drop
/components/core/html/tasks.json                → cgp:/core/html/tasks
```

The runtime indexes them by their `url` field and writes them into the
flat URL-keyed state object alongside everything else.

### Live state (continuous)

As users interact with the page, the runtime mints new URLs for
observatrons, events, anchors, and paths. These appear under
`cgp:/s/<system-id>/...` and are written to the same flat state
object. Listeners on the state-change channel receive the updates.

Both phases write into the same place. UIs reading from the state
object don't know or care which phase a given URL came from.

---

## What This Gives the UI

A single navigable graph of every URL the protocol knows about. A tree
view rendering the state object can group URLs by namespace:

```
cgp:/root/                          (protocol self-description)
├── events/
│   └── observatron/state-change
├── ops/                            (when populated)
└── formulas/                       (when populated)

cgp:/core/                          (canonical library)
└── html/
    ├── elements/
    │   ├── textarea
    │   └── div
    ├── forms/
    │   └── drag-and-drop
    └── tasks/
        └── file-upload

cgp:/s/0/                           (user system)
└── o/0/
    └── c/state-change/0/
        └── a/0/
            ├── p/0
            ├── p/1
            └── p/2
```

Every node in the tree is a URL. Every URL has four facets. Clicking
any node loads its facets into the inspector. The catalog and the live
state live in the same view because they live in the same
URL-addressable graph.

---

## Implementation Sequence

The catalog architecture is built in layers. The order matters:

1. **Component definitions ship first.** `cgp:/core/html/forms/drag-and-drop` exists as a four-facet JSON file. The runtime loads it and registers the canonical custom element.
2. **Catalog index files ship next.** `cgp:/core/html/forms`, `cgp:/core/html/elements`, `cgp:/core/html/tasks` — each is its own four-facet JSON whose `/data` lists members. The runtime loads these alongside component definitions.
3. **Compatibility relationships are added to component `/structure`.** `applies-to` and `performs` reference catalog URLs. The runtime can validate that referenced URLs exist; UIs can render the relationships as walkable links.
4. **Tree views consume the unified URL graph.** The left-panel tree shows reserved namespaces (loaded statically) and user systems (populated continuously) in the same hierarchy. The two grow at different rates but live in one tree.

Each layer is shippable on its own. The MVP can ship layer 1 alone and
still demonstrate the core homomorphism. Layers 2-4 add structural
richness without changing the underlying mechanism.

---

## Summary

The protocol's catalog is not a separate metadata system. It is the
URL graph itself, with reserved namespaces (`cgp:/root/`, `cgp:/core/`)
holding type-level definitions and user namespaces (`cgp:/s/<id>/`)
holding instance-level state. Both layers use the same four-facet
shape, the same URL grammar, the same runtime APIs. The "event bus" is
the runtime's binding of channel URLs to a delivery mechanism;
channels are themselves URLs and subscription is a URL operation.

Same shape at every scale, including the protocol's description of
itself.