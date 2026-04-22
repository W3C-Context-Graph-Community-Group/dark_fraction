# CGPL Event Bus — Build Spec (Step 1)

**Target deliverable:** a working event bus module for the Node server that serves `/calculator/1`, `/calculator/2`, and eventually the observatron sequencer. The bus is the **single append-only channel** through which every observed event in the system flows. It conforms to the CGPL canonical claim shape so emissions from any tool are interoperable with any other tool, with zero translation.

Alongside the bus, this spec defines the **canonical state representation** — a JSON shape for a single Observatron and for a System composed of Observatrons + Interactions. State and claims are two views of the same system: claims describe what happened (append-only history); state describes how things are right now (a single snapshot). A pure folding function bridges them. Both shapes are first-class deliverables in step 1.

**Step 1 scope:** bus + state representation + helpers + tests. No persistence (deferred). No UI changes beyond calculator/1 emitting claims. No new calculators. The backbone only, but the backbone is both claims *and* state.

---

## 1. Why this, why now

Every tool in the project — the dark fraction calculator, the observatron sequencer, anything that comes next — ultimately does the same thing: **it observes things and reports on what it has observed so far.** Two shapes express this:

- **Claims** are what just happened. Append-only, ordered, each carries one atomic event.
- **State** is what the system is right now. A single snapshot, compact, directly renderable.

The CGPL protocol already defines the canonical claim. This spec additionally defines the canonical state — one Observatron as a JSON object, one System as `{ observatrons: [...], interactions: [...] }`. Both shapes are shared across tools.

Rather than each tool inventing its own emission and its own state shape, **the bus carries claims and states in their canonical forms.** Calculator/1 emits facet-registration claims; the observatron sequencer reads a System snapshot per frame. When the time comes to connect them, all of that is additive — no existing tool gets rewritten.

Building the bus *before* the second calculator means both calculators are wired into it from day one. That's the cheapest path to the right architecture.

---

## 2. The canonical claim shape

Every event on the bus is a **claim** with exactly five fields. This is non-negotiable — it's the protocol's native vocabulary.

```ts
interface Claim {
  "claim-id":     string;   // URL, unique. Minted by the emitter at emit-time. Permanent.
  "claim-source": string;   // URL of the observatron (or tool) that produced it.
  "timestamp":    string;   // ISO 8601 UTC with millisecond precision. Monotonic per source.
  "key":          string;   // The property being asserted. Often a URL with a #facet fragment.
  "value":        string;   // The asserted value. Literal, number-as-string, or URL.
}
```

Rules enforced by the bus at emission time:

1. **All five fields must be present and strings.** Missing or wrongly-typed fields → `400 BAD_CLAIM`.
2. **`claim-id` must be unique across the log.** Duplicate → `409 CLAIM_EXISTS`.
3. **`timestamp` must parse as ISO 8601 and be ≥ the last timestamp from the same `claim-source`.** Otherwise → `422 NON_MONOTONIC`.
4. **`claim-id` and `claim-source` must look like CGPL URLs.** Accept any string of the form `cgp://<something>/…` (prefix check only; don't try to dereference).
5. **`key` and `value` are free-form strings.** The bus does not interpret them. Consumers interpret by convention.

Anything that violates the rules is rejected **before** appending to the log. Invalid claims never enter the stream.

---

## 3. Conventions for `key` and `value`

The bus doesn't enforce `key` / `value` semantics, but the tools that share the bus must agree on a vocabulary. For step 1, establish the following **conventional keys**. Document them in the module's README and use them consistently.

### 3.1 Keys already implied by the protocol documents

From the CGPL spec in the workspace:

- `cgp:open` — handshake emission; an observatron declares itself at a boundary
- `<dataset-url>#facet/meaning`, `<dataset-url>#facet/structure`, `<dataset-url>#facet/context` — facet assertions for a specific column

### 3.2 New keys required by the calculators

Define the following keys for step 1:

- `cgp:facet-registered` — one of {meaning, structure, context} got a URL assigned. `value` = full CGPL URL of the assigned facet (e.g. `cgp://.../dataset-1.csv#col-1/foo`).
- `cgp:facet-cleared` — a previously-registered facet was explicitly un-registered. `value` = the URL that used to be there. (Needed for the calculator's "Clear all" button to emit a proper record, not silently mutate state.)
- `cgp:message-event-received` — a new message-event arrived at an observatron. `value` = JSON-stringified `{ "message-id": ..., "attachments": [...] }` describing the arrival.
- `cgp:column-observed` — inside a message-event, a specific column came into the observatron's view. `value` = full column Data URL.
- `cgp:state-snapshot` — a tool broadcasts its current Observatron state as a single JSON blob. `value` = JSON-stringified Observatron (see §4). Used for handoff and inspection without requiring a subscriber to replay the claim log.

These five keys + `cgp:open` cover everything both calculators need. Adding new keys later is additive.

---

## 4. The canonical state representation

State is defined in three nested shapes: **Observatron**, **System**, and **Interaction**. Observatron is the atomic unit; System is an array of Observatrons plus an array of Interactions between them. Start with Observatron; everything else composes it.

### 4.1 The Observatron JSON shape

One Observatron's complete state at one moment in time:

```ts
interface Observatron {
  "id":     string;   // stable URL, e.g. "cgp://calculator-1/observatrons/local"
  "source": string;   // same as id, reserved for cases where the emitter differs from the observatron

  "message-events": MessageEvent[];   // chronological, append-only in practice
}

interface MessageEvent {
  "message-id": string;     // unique within this observatron, e.g. "msg-001"
  "timestamp":  string;     // ISO 8601 UTC ms
  "attachments": Attachment[];
}

interface Attachment {
  "path":    string;        // e.g. "dataset-1.csv"
  "columns": Column[];
}

interface Column {
  "name":   string;         // e.g. "col-1"
  "facets": Facets;
}

interface Facets {
  "data":      { "url": string };                  // always present; column's identity
  "meaning":   { "url": string | null };           // CGPL URL or null if unregistered
  "structure": { "url": string | null };
  "context":   { "url": string | null };
}
```

**Rules:**

1. `data.url` is mandatory and never null — it is the column's identity.
2. `meaning`, `structure`, `context` URLs are either a CGPL URL (starting `cgp://`) or `null`.
3. Once set in a sequence of states, a facet URL should remain set (monotonic verification) — but the state shape itself does not enforce this; it describes a snapshot regardless.
4. `message-events` must be in chronological order by timestamp. A later state snapshot may have more events than an earlier one but never fewer.
5. Nothing derived is stored: no δ, no ‖v‖, no region counts. Those are computed from this shape by the rendering layer (see §4.4).

### 4.2 The System JSON shape

A system of multiple observatrons, plus any interactions between them:

```ts
interface System {
  "observatrons":  Observatron[];
  "interactions":  Interaction[];
}

interface Interaction {
  "kind":     string;        // e.g. "fiber-bundle", "diff", "coupling"
  "between":  string[];      // array of Observatron id URLs; length ≥ 2
  "params":   object;        // kind-specific parameters; free-form
}
```

**Rules:**

1. Every id in `interactions[*].between` must appear in `observatrons[*].id`.
2. The `interactions` array may be empty (a system of one observatron has no interactions).
3. `kind` is free-form at the System level; specific tools define which kinds they know how to render. Unknown kinds are ignored by the renderer, not rejected.
4. `params` is kind-specific. A `"kind": "fiber-bundle"` interaction's `params` might include `{ "spike-pairing": "column-url-match" }`; a `"kind": "diff"` might include `{ "mode": "delta-delta-heatmap", "arrows": true }`.

### 4.3 Starting simple: single observatron

Step 1 is a single-observatron system. The calculator/1 integration uses a `System` with one element:

```json
{
  "observatrons": [
    {
      "id": "cgp://calculator-1/observatrons/local",
      "source": "cgp://calculator-1/observatrons/local",
      "message-events": []
    }
  ],
  "interactions": []
}
```

Everything wires up to handle this case first. The sequencer's four-observatron System slots in later without changes to the shape — just more items in `observatrons` and `interactions`.

### 4.4 Derived fields are NOT stored in state

State contains only what was directly observed: facet URLs and message-event structure. The following are **computed from state on demand** and never stored:

- δ per region (dark fraction, from the paper)
- ‖v‖ per column (verification magnitude)
- ‖F‖ per observatron (trajectory fingerprint, from Kowalski appendix)
- Δδ between two observatrons
- ∇Δδ tangent field on the sphere
- Any color, layout, or geometry parameter

This is a deliberate design rule. Storing derived fields creates the classic bug where two tools disagree because one of them cached an old value. The state is minimal and canonical; rendering pipelines compute on top of it. When the state changes, renderings re-derive.

### 4.5 Bridging claims and state: `deriveState()`

State and claims describe the same reality. A pure function folds a claim log into a System snapshot:

```js
// lib/event-bus/derive-state.js

/**
 * Fold a claim log into a System snapshot.
 * Pure function. Idempotent. Deterministic.
 *
 * Supported claim keys (step 1):
 *   cgp:open                     → ensures observatron exists in System
 *   cgp:message-event-received   → appends a MessageEvent to the matching observatron
 *   cgp:column-observed          → used as a bookkeeping event; columns are added
 *                                  via message-event-received, not this
 *   cgp:facet-registered         → sets a column's facet URL
 *   cgp:facet-cleared            → unsets a column's facet URL (sets back to null)
 *   cgp:state-snapshot           → replaces one observatron's state entirely with
 *                                  the snapshot in the claim value
 *
 * Unknown keys are ignored, not errors. This keeps the fold forward-compatible:
 * tools can emit keys the bus doesn't know about without breaking state derivation.
 *
 * @param {Claim[]} claims   chronological
 * @param {System} [initial] starting system (default: empty)
 * @returns {System}
 */
export function deriveState(claims, initial = emptySystem()) { ... }

export function emptySystem() {
  return { observatrons: [], interactions: [] };
}
```

Usage:

```js
import { bus } from '/lib/event-bus/index.js';
import { deriveState } from '/lib/event-bus/derive-state.js';

const currentSystem = deriveState(bus.query());
// renderer consumes currentSystem and draws
```

This is the canonical read path for any tool that wants "the state right now" from the bus. Tools keeping their own private state can still do so; `deriveState()` is available when they want the unified view.

---

## 5. Module shape

Create a shared directory at the project root: `lib/event-bus/`. Contents:

```
lib/event-bus/
├── index.js                ES-module entry point (exports bus singleton + state helpers)
├── event-bus.js            Core EventBus class
├── claim-validator.js      Pure function: validates claim shape, returns { ok, reason }
├── claim-helpers.js        Constructors: openClaim(), facetRegisteredClaim(), etc.
├── state-shapes.js         JSDoc typedefs for Observatron / System / Interaction + emptySystem()
├── state-validator.js      Pure function: validates Observatron and System shapes
├── derive-state.js         Pure function: claim log → System snapshot
├── platform.js             Environment-safe crypto wrapper (browser + Node)
├── README.md               Documents claim shape, state shape, conventional keys, usage
└── __tests__/
    ├── event-bus.test.js
    ├── claim-validator.test.js
    ├── claim-helpers.test.js
    ├── state-validator.test.js
    └── derive-state.test.js
```

The module is **pure JavaScript ES modules**, no TypeScript, no framework dependencies beyond a test runner. Use **Node's built-in `node:test`** for tests (no Jest, no Mocha — zero deps).

### 5.1 Core API — `EventBus` class

```js
// lib/event-bus/event-bus.js

export class EventBus {
  constructor() {
    this._log = [];                      // append-only list of claims
    this._subscribers = new Map();       // id → predicate/callback pair
    this._nextSubId = 1;
    this._lastTsBySource = new Map();    // source-url → last-timestamp (for monotonicity)
  }

  /**
   * Append a claim to the log, notify matching subscribers.
   * @param {Claim} claim
   * @returns {{ok: true, index: number} | {ok: false, code: string, reason: string}}
   */
  emit(claim) { /* ... */ }

  /**
   * Subscribe to future claims matching predicate.
   * @param {(claim: Claim) => boolean} predicate
   * @param {(claim: Claim, index: number) => void} callback
   * @returns {number} subscription id (pass to unsubscribe)
   */
  subscribe(predicate, callback) { /* ... */ }

  /** Remove a subscription. */
  unsubscribe(subId) { /* ... */ }

  /**
   * Return all claims matching predicate (or all claims if no predicate).
   * Useful for replay into a new subscriber.
   * @param {(claim: Claim) => boolean} [predicate]
   * @returns {Claim[]}   (new array — do not mutate)
   */
  query(predicate) { /* ... */ }

  /**
   * Number of claims in the log.
   * @returns {number}
   */
  size() { return this._log.length; }

  /**
   * Serialize the full log as JSON.
   * @returns {string}
   */
  serialize() { return JSON.stringify(this._log); }

  /**
   * Replace the log from a serialized snapshot. Useful for session restore.
   * Validates every claim before accepting; throws on any invalid claim.
   * @param {string} json
   */
  hydrate(json) { /* ... */ }
}
```

### 5.2 `index.js` — singleton entry point

```js
// lib/event-bus/index.js

import { EventBus } from './event-bus.js';

export const bus = new EventBus();          // process-wide singleton
export { EventBus };                          // class exported for tests / multi-bus use
export * from './claim-helpers.js';           // openClaim(), facetRegisteredClaim(), stateSnapshotClaim(), ...
export * from './state-shapes.js';            // emptySystem(), emptyObservatron()
export { validateObservatron, validateSystem } from './state-validator.js';
export { deriveState } from './derive-state.js';
```

Consumers import one singleton bus by default:

```js
import { bus, facetRegisteredClaim } from '/lib/event-bus/index.js';

bus.emit(facetRegisteredClaim({ source: '...', column: '...', facet: 'meaning', value: 'foo' }));
```

This is intentional. **One bus per process.** Multiple buses would mean multiple logs, which defeats the point.

### 5.3 Validator — `claim-validator.js`

```js
// Pure function. No imports. Testable in isolation.

export function validateClaim(claim, lastTsBySource) {
  // returns { ok: true } | { ok: false, code: '...', reason: '...' }
  // codes: MISSING_FIELD, WRONG_TYPE, BAD_URL, BAD_TIMESTAMP, NON_MONOTONIC
}
```

Must check, in order:
1. `claim` is a non-null object
2. All five keys present (`claim-id`, `claim-source`, `timestamp`, `key`, `value`)
3. All five values are strings
4. `claim-id` and `claim-source` start with `cgp://`
5. `timestamp` parses as ISO 8601
6. `timestamp >= lastTsBySource.get(claim-source)` if source has prior claim

### 5.4 Claim helpers — `claim-helpers.js`

Small constructors that mint valid claims with unique IDs and current timestamps. Reduce emission boilerplate and ensure conformance.

```js
export function openClaim({ source, boundary }) {
  return {
    'claim-id':     `${source}/emissions/${nowIso()}-${randomHex(8)}`,
    'claim-source': source,
    'timestamp':    nowIso(),
    'key':          'cgp:open',
    'value':        `boundary=${boundary} state=stateless`,
  };
}

export function facetRegisteredClaim({ source, columnUrl, facet, facetValue }) {
  // facet in {'meaning', 'structure', 'context'}
  // facetValue is the trailing segment: 'foo', 'bar', 'riz', or user input
  return {
    'claim-id':     `${source}/emissions/${nowIso()}-${randomHex(8)}`,
    'claim-source': source,
    'timestamp':    nowIso(),
    'key':          'cgp:facet-registered',
    'value':        `${columnUrl}/${facetValue}`,
  };
}

export function facetClearedClaim({ source, columnUrl, facet, priorValue }) {
  return {
    'claim-id':     `${source}/emissions/${nowIso()}-${randomHex(8)}`,
    'claim-source': source,
    'timestamp':    nowIso(),
    'key':          'cgp:facet-cleared',
    'value':        `${columnUrl}/${priorValue}`,
  };
}

export function messageEventReceivedClaim({ source, messageId, attachments }) {
  return {
    'claim-id':     `${source}/emissions/${nowIso()}-${randomHex(8)}`,
    'claim-source': source,
    'timestamp':    nowIso(),
    'key':          'cgp:message-event-received',
    'value':        JSON.stringify({ 'message-id': messageId, attachments }),
  };
}

export function columnObservedClaim({ source, columnUrl }) {
  return {
    'claim-id':     `${source}/emissions/${nowIso()}-${randomHex(8)}`,
    'claim-source': source,
    'timestamp':    nowIso(),
    'key':          'cgp:column-observed',
    'value':        columnUrl,
  };
}

export function stateSnapshotClaim({ source, observatron }) {
  // observatron: a fully-formed Observatron object (see §4.1).
  // Must pass validateObservatron() before emit; caller's responsibility.
  return {
    'claim-id':     `${source}/emissions/${nowIso()}-${randomHex(8)}`,
    'claim-source': source,
    'timestamp':    nowIso(),
    'key':          'cgp:state-snapshot',
    'value':        JSON.stringify(observatron),
  };
}
```

Internal helpers:

```js
function nowIso() {
  const d = new Date();
  const ms = String(d.getUTCMilliseconds()).padStart(3, '0');
  return d.toISOString().replace(/\.\d{3}Z$/, `.${ms}Z`);
}

function randomHex(len) {
  // 8-char hex suffix for claim-id uniqueness within a millisecond
  const bytes = crypto.getRandomValues(new Uint8Array(Math.ceil(len / 2)));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('').slice(0, len);
}
```

(Use `node:crypto` in Node context, `window.crypto` in browser. A 10-line wrapper handles both.)

### 5.5 State shapes — `state-shapes.js`

Pure data module. No logic. Provides JSDoc typedefs (see §4.1, §4.2) plus factory helpers:

```js
// lib/event-bus/state-shapes.js

export function emptySystem() {
  return { observatrons: [], interactions: [] };
}

export function emptyObservatron(id) {
  if (typeof id !== 'string' || !id.startsWith('cgp://')) {
    throw new Error('emptyObservatron: id must be a cgp:// URL');
  }
  return {
    id,
    source: id,
    'message-events': [],
  };
}
```

### 5.6 State validator — `state-validator.js`

```js
// Pure functions. Mirror of claim-validator.js for state shapes.

export function validateObservatron(obs) {
  // returns { ok: true } | { ok: false, code: '...', reason: '...', path: '...' }
  // codes: MISSING_FIELD, WRONG_TYPE, BAD_URL, NULL_DATA_URL,
  //        BAD_FACET_URL, OUT_OF_ORDER_EVENTS
}

export function validateSystem(sys) {
  // validates the System envelope and every contained Observatron.
  // Also checks interactions[*].between references exist in observatrons[*].id.
  // codes: MISSING_FIELD, WRONG_TYPE, DANGLING_INTERACTION_REF, INTERACTION_TOO_FEW_NODES
}
```

Must check, in order, for `validateObservatron`:

1. `obs` is a non-null object
2. `id`, `source`, `message-events` present; `id` and `source` start with `cgp://`
3. `message-events` is an array
4. Each event has `message-id`, `timestamp`, `attachments`
5. Each attachment has `path` and `columns` (array)
6. Each column has `name` and `facets` object with all four facets
7. `facets.data.url` is a string starting with `cgp://` (never null)
8. `facets.meaning.url`, `facets.structure.url`, `facets.context.url` are each either null or strings starting with `cgp://`
9. `message-events` are in non-decreasing timestamp order

### 5.7 State derivation — `derive-state.js`

Pure function that folds a claim log into a System snapshot. See §4.5 for the function contract and supported claim keys.

**Implementation rules:**

- Idempotent: `deriveState(claims) === deriveState(claims)` for the same input.
- Deterministic: no time-based or random inputs used inside.
- Forward-compatible: unknown claim keys are skipped, not errored.
- Monotonic: if a later claim sets a facet URL, the state keeps it set. A `cgp:facet-cleared` claim is the only way to set a facet back to null.
- Snapshot claims (`cgp:state-snapshot`) **replace** one observatron's state entirely with the JSON value. They are an override, not a merge.
- The function must never throw on an input that was produced by this bus's own claim helpers; malformed claim values (e.g. corrupted `cgp:state-snapshot` JSON) should be skipped silently and logged to `console.warn` in the browser, `console.error` in Node.

---

## 6. Integration points

### 6.1 Node server

The server that serves the calculators exposes the bus in two ways:

1. **Static file serving** (unchanged from existing setup): `/calculator/1`, `/calculator/2`, `/lib/event-bus/*`. The frontend imports the bus module directly. Everything runs in the browser. The singleton is per-tab.

2. **(Optional, defer to step 2)** A tiny HTTP API at `/api/bus/*` that mirrors the class methods. When built, frontends can choose to use the local in-tab bus *or* route through the server. Step 1 does not build this.

The server is a static-file server (Express, `http-server`, or `serve` — pick one; doesn't matter which). Routes:

```
/                            → index page with links to calculator routes
/calculator/1                → existing dark fraction calculator
/calculator/2                → 404 with "Coming soon: sequencer" (built later)
/calculator/:n (n ≥ 3)       → 501 Not Implemented, JSON body:
                                { "error": "topology not yet defined for N nodes" }
/lib/event-bus/*             → served statically for frontend imports
```

### 6.2 Calculator/1 (dark fraction calculator)

The existing calculator emits a claim every time the user:

- Clicks M/S/C to register a facet → emit `facetRegisteredClaim(...)`
- Clicks × on a registered facet → emit `facetClearedClaim(...)`
- Clicks "Verify all" → emit one `facetRegisteredClaim` per M/S/C per variable
- Clicks "Clear all" → emit one `facetClearedClaim` per previously-registered facet
- Drops a CSV → emit one `messageEventReceivedClaim` followed by N `columnObservedClaim`s

The calculator's δ display re-renders from the current state, which it can compute either from its own internal model (as it does now) **or** by querying the bus:

```js
// reconstruct state from bus
const facetClaims = bus.query(c =>
  c['claim-source'] === MY_OBS_URL &&
  (c.key === 'cgp:facet-registered' || c.key === 'cgp:facet-cleared')
);
// fold claims chronologically to get current state
```

For step 1: **keep the existing internal state as the source of truth; emit claims as a side effect.** Don't rewrite the calculator to be bus-driven. That's a later refactor. Step 1 just adds emissions — no behavior change.

### 6.3 Claim source URL for calculator/1

The dark fraction calculator's observatron URL is:

```
cgp://calculator-1/observatrons/local
```

All claims it emits use this as `claim-source`. Predictable, stable. No per-session randomness in the source ID — that would fragment the log uselessly. (If multi-user support comes later, the source can include a user/session segment.)

---

## 7. Browser vs Node

The bus runs in **both** environments:

- **Browser (frontend):** each tab has its own singleton bus in memory. Emissions from calculator/1 are visible only to that tab. This is step-1 sufficient.
- **Node (backend):** the server can optionally maintain its own bus for logging / persistence. Not built in step 1.

The module must be isomorphic — same code runs in both. The only environment-specific piece is `randomHex()` (uses `crypto` differently). Wrap it in a file that detects the environment:

```js
// lib/event-bus/platform.js
let _crypto;
if (typeof window !== 'undefined' && window.crypto) {
  _crypto = window.crypto;
} else {
  _crypto = (await import('node:crypto')).webcrypto;
}
export const crypto = _crypto;
```

---

## 8. Testing

All tests use `node:test` and `node:assert`. Run with `node --test lib/event-bus/__tests__/*.test.js`.

### 8.1 `claim-validator.test.js` — required coverage

- Empty object → fails with `MISSING_FIELD`
- Missing one field → fails with `MISSING_FIELD`
- Non-string field → fails with `WRONG_TYPE`
- `claim-id` without `cgp://` prefix → fails with `BAD_URL`
- `claim-source` without `cgp://` prefix → fails with `BAD_URL`
- Malformed timestamp → fails with `BAD_TIMESTAMP`
- Timestamp older than last for same source → fails with `NON_MONOTONIC`
- Well-formed claim → returns `{ ok: true }`

### 8.2 `event-bus.test.js` — required coverage

- Fresh bus has `size() === 0`
- `emit()` of valid claim returns `{ ok: true, index: 0 }` and grows size
- `emit()` of invalid claim returns `{ ok: false, code, reason }` and does not grow size
- Two emissions with same `claim-id` → second returns `CLAIM_EXISTS`
- `subscribe()` calls callback for matching future emissions
- `subscribe()` does NOT retroactively call for past emissions (use `query()` for replay)
- `unsubscribe()` stops the callback
- `query()` with predicate returns only matching claims
- `query()` with no predicate returns a copy of the entire log
- `serialize()` + `hydrate()` round-trips correctly
- `hydrate()` with an invalid claim in the middle of the array throws and does not leave partial state

### 8.3 `claim-helpers.test.js` — required coverage

- Each constructor produces a claim that passes `validateClaim`
- `claim-id`s are unique across 1000 rapid calls
- `timestamp`s are monotonically non-decreasing across 1000 rapid calls
- `openClaim()` key is `cgp:open`
- `facetRegisteredClaim()` value ends with `/foo`, `/bar`, or `/riz` when given those inputs
- `stateSnapshotClaim()` value is a JSON string that parses back to the input observatron

### 8.4 `state-validator.test.js` — required coverage

- `validateObservatron(emptyObservatron('cgp://x/o/y'))` → `{ ok: true }`
- Missing `id` → `MISSING_FIELD` with `path: 'id'`
- `id` not a `cgp://` URL → `BAD_URL`
- `message-events` not an array → `WRONG_TYPE`
- A column with `facets.data.url === null` → `NULL_DATA_URL`
- A column with `facets.meaning.url` that is a non-null non-`cgp://` string → `BAD_FACET_URL`
- Events out of chronological order → `OUT_OF_ORDER_EVENTS`
- `validateSystem(emptySystem())` → `{ ok: true }`
- An interaction referencing a non-existent observatron id → `DANGLING_INTERACTION_REF`
- An interaction with fewer than 2 entries in `between` → `INTERACTION_TOO_FEW_NODES`
- A well-formed System with 1 observatron and 0 interactions → `{ ok: true }`

### 8.5 `derive-state.test.js` — required coverage

- `deriveState([])` returns `emptySystem()`
- A single `cgp:open` claim creates one Observatron in the System
- A `cgp:message-event-received` claim adds one message-event to the matching observatron
- A `cgp:facet-registered` claim sets the named facet URL on the matching column
- A `cgp:facet-cleared` claim sets the named facet URL back to null
- A `cgp:state-snapshot` claim replaces the matching observatron's state wholesale
- Unknown claim keys are skipped without throwing
- Malformed `cgp:state-snapshot` value (non-parseable JSON) is skipped with a console warning; other claims still apply
- The function is idempotent: two calls on the same claim array return deep-equal Systems
- The function is pure: passing the same claims in different order *may* yield different results (it's history-sensitive), but passing the same claims in the same order always yields the same result

**All tests must pass on a fresh clone before merging.** No flakes.

---

## 9. Demo / sanity check

At the bottom of `index.js`, add a guarded self-demo:

```js
// Run via: node lib/event-bus/index.js
if (import.meta.url === `file://${process.argv[1]}`) {
  const src = 'cgp://calculator-1/observatrons/local';
  bus.subscribe(c => true, (c, i) => {
    console.log(`[${i}] ${c.key}  ${c.value}`);
  });

  bus.emit(openClaim({ source: src, boundary: 'cgp://calculator-1/boundaries/demo' }));
  bus.emit(facetRegisteredClaim({
    source: src,
    columnUrl: 'cgp://calculator-1/dataset-1.csv#col-1',
    facet: 'meaning',
    facetValue: 'foo',
  }));
  bus.emit(facetRegisteredClaim({
    source: src,
    columnUrl: 'cgp://calculator-1/dataset-1.csv#col-2',
    facet: 'structure',
    facetValue: 'bar',
  }));

  console.log(`\nLog size: ${bus.size()}`);
  console.log(`Query by source: ${bus.query(c => c['claim-source'] === src).length}`);

  // Derive state from the claim log and print it.
  const system = deriveState(bus.query());
  console.log(`\nDerived System:\n${JSON.stringify(system, null, 2)}`);
}
```

Running `node lib/event-bus/index.js` should print three claim lines, the summary counts, and the derived System as JSON. That's the end-to-end smoke test: claims in, claims emitted, claims folded to state.

---

## 10. Acceptance criteria

1. `lib/event-bus/` directory exists with all files listed in §5.
2. `node --test lib/event-bus/__tests__/*.test.js` passes 100%.
3. `node lib/event-bus/index.js` runs the demo from §9 and prints the expected output (three claims, counts, derived System).
4. The Node server serves `/lib/event-bus/` so the frontend can import `index.js`.
5. `/calculator/1` emits valid claims on every user action listed in §6.2. Verify by opening the calculator, opening browser DevTools console, and watching `bus.query()` grow.
6. `/calculator/2` returns 404 with "Coming soon".
7. `/calculator/:n` (n ≥ 3) returns 501 JSON per §6.1.
8. Calling `deriveState(bus.query())` at any time in the calculator tab returns a valid System (passes `validateSystem`) whose one observatron matches the calculator's visible state.
9. Nothing in the calculator's behavior regresses. The δ display updates exactly as before. The bus is a pure side-channel for step 1.
10. `README.md` in the module directory documents the five-column claim shape, the Observatron/System shapes, the conventional keys, and a 10-line usage example that includes both emission and `deriveState()`.
11. No dependencies added to package.json. Zero new packages. (This is a hard constraint — the bus must be standalone.)

---

## 11. What step 1 explicitly does NOT build

- Persistence (logs are in-memory, lost on refresh)
- WebSocket bridge between tabs
- Cross-process synchronization
- HTTP API endpoints for the bus
- Authentication or claim signing
- Rate limiting
- Backpressure handling for slow subscribers
- Subscriber error isolation (step 1: one throwing subscriber takes down the emit call — that's fine, we'll fix it later)
- The observatron sequencer (`/calculator/2`)
- Calculator/1 reading FROM the bus to rebuild its render (step 1: the bus is write-only from the calculator's perspective; `deriveState()` exists and is testable, but the UI doesn't consume it yet)
- Any derived field computation (δ, ‖v‖, ‖F‖, Δδ). Derivation belongs to renderers, not to the bus module.

Every item above is intentionally deferred. They are the backlog for step 2 and beyond.

---

## 12. File layout after step 1 is merged

```
dark_fraction/
├── calculator/                       ← existing calculator/1 code
│   ├── index.html                    ← modified only to import bus and emit on actions
│   ├── 1.html
│   ├── 2.html
│   └── n.html
├── lib/
│   └── event-bus/
│       ├── index.js                  ← exports bus singleton + state helpers
│       ├── event-bus.js              ← EventBus class
│       ├── claim-validator.js        ← validateClaim()
│       ├── claim-helpers.js          ← openClaim(), facetRegisteredClaim(), ... stateSnapshotClaim()
│       ├── state-shapes.js           ← emptySystem(), emptyObservatron(), typedefs
│       ├── state-validator.js       ← validateObservatron(), validateSystem()
│       ├── derive-state.js           ← deriveState(claims) → System
│       ├── platform.js               ← env-safe crypto wrapper
│       ├── README.md                 ← docs: claim shape, state shapes, conventional keys
│       └── __tests__/
│           ├── event-bus.test.js
│           ├── claim-validator.test.js
│           ├── claim-helpers.test.js
│           ├── state-validator.test.js
│           └── derive-state.test.js
├── observatrons/                     ← existing sequencer prototypes, untouched
├── ui-bindings/                      ← existing, untouched
├── server.js                         ← the Node server; minor route additions per §6.1
└── package.json                      ← unchanged (no new deps)
```

---

## 13. After step 1

The immediate next steps, in order:

1. **Step 2:** WebSocket bridge so two tabs (calculator/1 and a future sequencer) see the same log. Shipping claims between tabs also means shipping state snapshots — `cgp:state-snapshot` claims travel over the same channel. No additional protocol work required.
2. **Step 3:** Persist the claim log to disk (append-only file), rehydrate on server start. `deriveState()` is already pure, so restoration is just "read log, fold, render."
3. **Step 4:** Build `/calculator/2` (the observatron sequencer from BUILD-SPEC.md) and wire it into the bus. The sequencer's per-frame rendering consumes `System` snapshots; step 1 already defined that shape.
4. **Step 5:** A `/stream` page that renders the raw claim log in real time. Useful for debugging and for showing Jacek what's flowing.
5. **Step 6:** Refactor calculator/1 to render *from* the bus's derived state (not from its private internal state). This is the move from "bus as side-channel" to "bus as source of truth." Only worth doing after steps 2–5 give it something to restore from.

Each step is additive. No rewrites.

