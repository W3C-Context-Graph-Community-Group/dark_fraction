# URLs.MD

## The CGP containment hierarchy

```
System ⊃ Observatron ⊃ Channel ⊃ Event ⊃ Anchor ⊃ Path
```

Read left-to-right as "contains." A **system** is the broadest scope — an application, service, or bounded context. Inside it, one or more **observatrons** watch what happens (think of an observatron as an instrumented surface — a page, a component tree, a workflow). Each observatron exposes **channels**, which are named streams of related happenings (`system-instantiated`, `user-input`, `state-change`). Channels carry **events**, the discrete things that occurred at a point in time. Each event is grounded by an **anchor**, the stable identifier of the thing the event is *about*. And the anchor resolves through a **path**, the addressable location within that anchor's structure.

The reason this nests cleanly is that each level answers a different question about the same happening: *which app?* (system) → *which surface?* (observatron) → *what kind of stream?* (channel) → *what specifically occurred?* (event) → *attached to what?* (anchor) → *where in it?* (path).

## Terms table

| Term | Role | Cardinality below | Example |
|---|---|---|---|
| System | Bounded application or service context | has many observatrons | `0` (a user-facing app) |
| Observatron | Instrumented surface within a system | has many channels | `1` (the calculator page) |
| Channel | Named stream of related events | has many events | `state-change` |
| Event | Discrete occurrence at a timestamp | has one anchor | a drop happened at `2026-04-26T20:01:16Z` |
| Anchor | Stable identifier of the subject | has one path | `cgp:/s/0` |
| Path | Addressable location within the anchor | terminal | `/structure/constraint-key` |

## Rosetta stone

| Concept | URI segment | HTML tag/attribute | Where it shows up |
|---|---|---|---|
| System | `cgp:/s/{id}` | `system-id="0"` | `cgp:/s/0/...` in the Observatron layers panel |
| Observatron | `/o/{id}` | `observatron-id="1"` | `cgp:/s/0/o/0` (the selected layer) |
| Channel | `/c/{name}` | (emitted, not declared) | `state-change` in `cgp:/s/0/o/0/c/state-change/...` |
| Event | `/{seq}` after channel | (emitted at runtime) | the `0/a/0/p/0`, `0/a/0/p/1`... sequence |
| Anchor | `/a/{id}` | `target="#selector"` resolves to one | `"cgp:/s/0"` under `"anchor"` in the demo state JSON |
| Path | `/p/{id}` or `"/data"`, `"/meaning"` | implicit in the wrapped DOM subtree | `/data`, `/meaning`, `/structure`, `/context` keys |
| Component (kind) | — | `cgp-{syntax}-{library}-{component}` | the tag name itself |

## Notes

**The URI carries instances; the tag carries kinds.** `cgp-html-forms-drag-and-drop` tells you *what kind of thing* this is. `system-id` and `observatron-id` tell you *which one*. Together they reconstruct the full URI.

**Channels, events, and paths aren't authored — they're emitted.** A developer writes the tag and (optionally) the IDs. The runtime produces channels, events, and the `/p/...` sequence as the component runs.

**Anchor vs. path is the subtlest pair.** Anchor = "what entity?" Path = "where inside it?" `"anchor": ["cgp:/s/0"]` identifies the system as the subject; `/structure`, `/context`, `/meaning` are paths into that subject's internal shape. Same split as `https://example.com/users/42` (anchor: the user) vs. `#email` (path: a field on them).

**Observatron needs a gloss.** It's a coined term — on first use in docs, define it: *"an observatron is an instrumented surface — typically a page, route, or component subtree — that emits events on its channels."* The other five terms are either standard or self-evident in context.