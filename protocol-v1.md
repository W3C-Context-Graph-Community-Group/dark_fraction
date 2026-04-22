# /cg/0/protocol

data
_______

# CONTEXT GRAPH PROTOCOL

**Implemented as CGPL: Context Graph Protocol Language**
**Version 2**

```
Version <number>.<0 (False) | Update In Progress, 1 (True) | Released>
```
---

WHAT THE PROTOCOL IS
--------------------

Declare a boundary, observe communication across it, and have rules for
that process.

A boundary is any URL-addressable interface you want to observe. It can be
a column in a CSV, a chat input field, a document upload point, an API
endpoint, a conversation, a query, or any other interface where something
crosses from outside a system to inside. You decide what your boundary is;
the protocol does not mandate a scope.

An observatron is the thing you station at a boundary. It watches. When
something crosses, it emits a record of what happened. The record is a
canonical claim in the five-column form described below. That is the whole
protocol: boundaries are declared, observatrons emit claims, and the claims
accumulate into a graph whose edges certify verified measurements.

Nothing else is required. No central authority, no shared schema, no
database, no server. An observatron can run in a browser, on a server, in
an embedded device, or on paper. Its claims can live in a git repository,
an object store, a folder of text files, or any other place where URLs
resolve to content.


VOCABULARY
----------

Three words the rest of this document uses together. They are distinct,
and keeping them distinct helps.

  BOUNDARY     A URL-addressable interface where something crosses from
               outside a system to inside. A column, a chat input, a
               file upload zone, an API endpoint. The place where
               observation happens.

  OBSERVATRON  The entity stationed at a boundary that watches what
               crosses it. An autonomous extended finite-state
               transducer. When the observatron sees something, it
               emits.

  CLAIM        The thing an observatron produces when it emits. A row
               in the five-column canonical form described below. The
               record of a single observed event.

The verb is "emit." The subject is an observatron. The object is a
claim. An observatron emits claims. The act of emitting is sometimes
called an emission — same act, just the noun form. The claim is what
is emitted. A claim is always a single five-column row.

This distinction matters because "emission" names the act and "claim"
names the result, and the document uses both words deliberately.


THE FOUR FACETS
---------------

Any URL-addressable resource the protocol touches is decomposed into four
facets. The decomposition applies uniformly: a CSV column has four facets, a
README file has four facets, an observatron's declaration has four facets, a
single claim has four facets. Same four facets, applied at every
level.

  **DATA**        The raw value that crosses the boundary, or the raw content
              of the resource. What is being communicated.

  **MEANING**     What the value refers to. The semantic definition. For a date
              column, "execution date of a trade" or "order placement time."

  **STRUCTURE**   How the value is encoded. Format, type, constraints. For a
              date, "ISO-8601 UTC" or "MM/DD/YYYY in America/New_York
              timezone."

  **CONTEXT**     A temporal log of entries recording what has happened to this
              resource over time. Not a snapshot — an append-only sequence.
              Each entry records something that occurred: a rule firing, an
              ask emitted, a user answer, a reference resolved, a policy
              applied. Entries accumulate in order, so a reader can replay
              what Context knew at any point in time.

              Context is a distinct shape from the other three facets.
              Data, Meaning, and Structure are stable descriptions of what
              the resource IS. Context is a time-ordered record of what
              has OCCURRED around it. These are different kinds of answer
              and they are kept separate.

The four facets are ordered by dependency: Context is surfaced first because
it grounds the others. Meaning and Structure are compared next. Data is
interpreted last — its comparison is void unless Meaning and Structure are
aligned, and they are unverifiable unless sufficient Context has been
recorded.


THE FIVE CANONICAL CLAIM COLUMNS
--------------------------------

Every claim from every observatron has exactly five columns. These
columns are informationally irreducible: remove any one and the protocol
breaks.

  **claim-id**          URL that uniquely identifies this claim. The URL
                    dereferences to the claim's content. Assigned by the
                    observatron at emission time and permanent thereafter.

  **claim-source**      URL of the observatron (or other entity) that produced
                    the claim. Answers "who is asserting this claim."

  **timestamp**         When the claim was produced. ISO 8601 UTC with millisecond
                    precision. Monotonically increasing within a single source's
                    sequence.

  **key**               The property being asserted. Often a URL that includes a
                    facet fragment — for example, a key like
                    "cgp://system/dataset/column#facet/meaning" asserts the
                    Meaning facet of that column.

  **value**             The asserted value. A literal string, a number, or a URL
                    pointing to another resource.

A claim in JSON looks like this:
```json
  {
    "claim-id":     "cgp://chat-app/observatrons/obs-1/emissions/20260419T170000Z-001",
    "claim-source": "cgp://chat-app/observatrons/obs-1",
    "timestamp":    "2026-04-19T17:00:00.000Z",
    "key":          "cgp:open",
    "value":        "boundary=cgp://chat-app/boundaries/demo state=stateless"
  }
```

CONTEXT ENTRIES: THE FOUR-COLUMN SHAPE
--------------------------------------

Entries inside a Context facet use a leaner shape than the five-column
canonical claim. A Context entry has four columns:

  **timestamp**   When the entry was appended. ISO 8601 UTC, millisecond
              precision. The temporal log is ordered by this column.

  **category**    What kind of event this entry records — for example,
              rule-fired, ask-emitted, user-answer, reference, policy-
              applied. Categories are declared in CGPL by the observatron's
              rules; any observatron can introduce its own categories by
              naming them in its markup. Readers filter the Context log
              by category to get a view of just one kind of event.

  **key**         The specific property being recorded within that category.
              For a rule-fired entry: rule-id, matched-column, ask-id.
              For a user-answer entry: resolution-url, option-selected.
              Free-form within the category.

  **value**       The asserted value. Literal or URL.

No claim-id column — identity is positional. The entry's index in the
Context array IS its identity. The fourteenth entry is entry 14; no
minted URL required.

No claim-source column — source is structural. A Context facet belongs
to a dataset URL, which is owned by an observatron. Walking the URL
reveals who wrote the facet. Writing source into every entry would
restate what the URL already says.

A Context entry in JSON looks like this:
```json
  {
    "timestamp":    "2026-04-19T17:05:00.100Z",
    "category":  "rule-fired",
    "key":          "rule-id",
    "value":        "R1"
  }
```
If a single event records several facts, the observatron appends several
entries, one per fact, sharing a timestamp (or nearly so):
```json
  { "timestamp": "...100Z", "category": "rule-fired", "key": "rule-id",        "value": "R1" }
  { "timestamp": "...101Z", "category": "rule-fired", "key": "matched-column", "value": "date" }
  { "timestamp": "...102Z", "category": "rule-fired", "key": "triggered-ask",  "value": "asks/timezone-ab3f" }
```
The whole Context facet is therefore a log of small, uniform, append-only
records. It is shaped like the protocol itself — but lighter, because its
enclosing scope provides half the structure for free.

A note on the two shapes together. A standalone claim in the five-column
form may still TARGET a Context facet — for example, an observatron
emitting a claim with key = "<dataset-url>#facet/context" and value
summarizing or marking what's in that facet. That claim is a full
five-column claim; it announces or references Context. The four-column
entries live INSIDE the Context facet itself, reachable by dereferencing
the facet and walking the log. The two shapes cooperate: claims are how
the graph points AT Context; entries are what Context contains.


WHY TWO SHAPES: THE ADDRESSING PRINCIPLE
----------------------------------------

Claims and Context entries differ by two columns because of a design
principle the protocol observes throughout: if a fact is already carried
by the addressing system, the data does not restate it.

A standalone claim has no enclosing scope. It could be about anything,
produced by anyone, sitting anywhere in the log. It needs claim-id (to
identify itself) and claim-source (to name who asserted it) because
nothing else supplies those facts.

A Context entry has an enclosing scope. It lives inside a specific facet
of a specific URL. The URL path already encodes which dataset, which
facet, which observatron. The entry's position already identifies it
within the facet. So a Context entry only needs to record what is
specific to the entry itself — when, what kind, what property, what
value.

More generally: the URL topology carries information. Hierarchy, path
structure, fragments, and naming conventions are all doing work that
would otherwise have to be carried in fields. The protocol treats the
address space as a free channel and declines to duplicate what the
address already says.

This shows up elsewhere too:

  - A claim's key often targets "<subject-url>#facet/<name>". The
    fragment names the facet. Claims sharing the same (claim-id, key)
    pair form a hyperedge without needing a separate "group" column.

  - The filesystem layout mirrors URL paths. A file at
    obs-csv/events/00047.json tells you, by its location alone, which
    observatron owns it and where it sits in the event sequence. The
    JSON inside does not restate these facts.

  - Resolution URLs like cgp://app/resolutions/timezone/singapore encode
    the category in the path. A reader walking resolutions/ gets all
    resolutions without a type column; walking resolutions/timezone/
    filters to timezone ones.

The principle has several names across fields — hierarchical containment
(filesystems), location-addressability (distributed systems), convention
over configuration (web frameworks), URI-as-affordance (hypermedia). In
information-theoretic terms, it is the mutual information between the
address space and the data it addresses: every bit of structural
correspondence is a bit that does not have to be stored separately.

Practically, this keeps entries small, keeps facts from drifting out of
sync (derived facts cannot disagree with the address they were derived
from), and makes the graph self-descriptive — a reader can learn a great
deal by inspecting URLs alone before any data is dereferenced.


HELLO WORLD: THE MINIMAL EMISSION
---------------------------------

The smallest possible act under the protocol: one observatron declares
itself into existence at a boundary. The equivalent of a TCP SYN — the
opening handshake.

In Python, the whole thing is about fifteen lines:
```python
  import json, uuid
  from datetime import datetime, timezone

  def iso_utc_ms():
      now = datetime.now(timezone.utc)
      return now.strftime("%Y-%m-%dT%H:%M:%S.") + f"{now.microsecond//1000:03d}Z"

  OBSERVATRON = "cgp://hello-world/observatrons/obs-001"
  BOUNDARY    = "cgp://hello-world/boundaries/demo"

  ts = iso_utc_ms()
  claim = {
      "claim-id":     f"{OBSERVATRON}/emissions/{ts}-{uuid.uuid4().hex[:8]}",
      "claim-source": OBSERVATRON,
      "timestamp":    ts,
      "key":          "cgp:open",
      "value":        f"boundary={BOUNDARY} state=stateless",
  }
  print(json.dumps(claim))
```
Running it produces one line of JSON. That line is a complete, conformant
CGP claim. It declares that obs-001 has stationed itself at the
hello-world/boundaries/demo boundary in stateless mode. Nothing more. No
rotations yet, no measurements yet, no facets compared. Just the handshake.

This is the atom of the protocol. Every richer interaction is a sequence
of claims like this one, each adding a claim to the graph.


CGPL: DECLARING THE SAME THING IN MARKUP
----------------------------------------

The Hello World above is fifteen lines of Python. The same act can be
declared in markup. An observatron that reads a page (or a text file, or
any parseable document) looks for CGPL tags — Context Graph Protocol
Language — and emits claims on their behalf.

The minimal CGPL tag:
```html
  <cgp-hello-world/>
```
An observatron parsing a document that contains this tag emits one
claim identical in shape to the Python Hello World above: a five-column
row announcing that the observatron saw this marker. The markup is the
declaration; the observatron does the emitting.

Tag names use hyphens (not colons), following the HTML Custom Elements
standard. Any HTML5 parser — a browser, BeautifulSoup, lxml, an editor's
syntax highlighter — handles these tags natively. No custom parser
required.

A slightly richer tag, declaring an observatron's presence with
attributes:
```
  <cgp-observatron id="obs-csv"
                   boundary="cgp://chat-app/boundaries/upload/csv"
                   role="column-auditor">
    <cgp-rule id="R1"
              action="ask"
              if="has-relative-date-token"
              category="rule-fired"
              question-type="timezone"/>
  </cgp-observatron>
```
This declares an observatron stationed at a CSV-upload boundary, with
one rule: if a column contains a relative date token (like "yesterday"),
emit an ask about timezone. The rule's category ("rule-fired") is the
value that will appear in Context entries when the rule fires — the
CGPL markup is where categories get named.

The tag shape follows HTML conventions — angle brackets, attributes,
nesting. Any parser that handles HTML or XML can read it. Any editor
that syntax-highlights HTML renders it legibly. This is deliberate:
CGPL rides on infrastructure that already exists everywhere, rather
than inventing new syntax.

CGPL layers over any host format that permits text annotations. The
tags are embeddable. Any document format that supports markup,
comments, or arbitrary string content can carry CGPL tags inline:

  - HTML and XML documents carry CGPL tags directly
  - Markdown carries CGPL tags inline or inside HTML blocks
  - JSON carries CGPL tags as string values or inside comments
    (in JSON-with-comments variants)
  - CSV carries CGPL tags inside comment rows or field values
  - Source code (Python, JavaScript, Rust, etc.) carries CGPL tags
    inside comments
  - Configuration files (YAML, TOML) carry CGPL tags inside comments
    or string fields
  - Plain text files carry CGPL tags verbatim

An observatron reading a document scans for CGPL markers regardless of
the surrounding host format. The host format is transparent to the
observatron — it is looking for tag shapes, not for document structure.
This is why a single observatron implementation can serve a heterogeneous
collection of documents: the tag format is universal; the host formats
are whatever the authors already use.

The property is bounded: CGPL needs a host format that permits text
annotations. Binary formats, machine code, and formats with strict
schema validation that rejects unknown fields cannot embed CGPL
directly. For those cases, CGPL tags can be stored in a sidecar file
whose URL references the binary resource.

CGPL is not the only way to declare observatrons and rules. Any format
that produces conformant claims is valid — YAML, JSON, Python code,
anything. CGPL is the reference format because markup is ubiquitous
and because documents can declare their own observers inline, right
where observation should happen.

End-to-end: a CGPL tag in an HTML file, with a script that reads the
tag and produces the claim. The whole cycle in one file:
```html
  <!DOCTYPE html>
  <html>
  <body>

    <!-- The declaration. Markup the observatron will read. -->
    <cgp-hello-world/>

    <!-- The observatron. A small script that reads CGPL and emits. -->
    <script>
      const observatronUrl = "cgp://page/observatrons/obs-1";
      const boundaryUrl    = "cgp://page/boundaries/dom";

      document.querySelectorAll('cgp-hello-world').forEach(() => {
        const ts = new Date().toISOString();
        const claim = {
          "claim-id":     `${observatronUrl}/emissions/${ts}`,
          "claim-source": observatronUrl,
          "timestamp":    ts,
          "key":          "cgp:open",
          "value":        `boundary=${boundaryUrl} state=stateless`
        };
        console.log(JSON.stringify(claim));
      });
    </script>

  </body>
  </html>
```
Open the page in a browser, check the console — one claim printed, in
the same five-column form the Python Hello World produces. The two
halves have distinct roles:

  - The MARKUP is declarative. It says what should be observed. It
    carries no behavior on its own. A designer, author, or domain
    expert can write CGPL tags without knowing JavaScript.

  - The SCRIPT is imperative. It walks the DOM, finds CGPL tags, and
    emits claims for each one. The same script works for any page
    with CGPL tags — the behavior is separable from the content.

This separation is not CGP's invention. Web frameworks have used it
for decades: HTML declares structure, JavaScript operationalizes it.
CGPL rides on the same pattern. Any page with CGPL tags and a CGPL
runtime script becomes an emitter.

Declaring math in CGPL. A CGPL tag can carry formulas, not just
configuration. A Unicode math expression in a tag's text content IS
the canonical statement of the formula — language-neutral,
implementation-neutral, readable by humans and parseable by machines:
```html
  <cgp-formula name="dark-fraction">
    δ = 1 − |B_r| / 2ⁿ
  </cgp-formula>
```
A JavaScript runtime can read the tag, parse the expression, and
compile it into executable code:
```javascript
  document.querySelectorAll('cgp-formula').forEach(el => {
    const name = el.getAttribute('name');
    const expr = el.textContent.trim();
    // parse expr and realize it as a function
    // e.g., darkFraction = (n, r) => 1 - hammingBall(n, r) / 2**n;
    console.log(`registered formula: ${name} = ${expr}`);
  });
```
A Python runtime could do the same thing with SymPy. A Rust runtime
could generate a compiled function. Each implementation is free to
realize |B_r| (the cardinality of a Hamming ball of radius r) however
it wants — as a helper, a closed-form expansion, a lookup table.

The formula is the spec. The code is one realization of it.

This is CGP's deeper bet on portability: mathematics is the most
format-agnostic documentation there is. A Polish mathematician, an
American engineer, and an AI can all read δ = 1 − |B_r| / 2ⁿ without
translation. Code needs a runtime. Prose needs a language. Math
transcends both. Declaring math in CGPL makes it a first-class
protocol artifact — addressable, self-describing, and implementable
by anyone in any language.


OBSERVATRON IN A CHAT APPLICATION
---------------------------------

A slightly richer example. A chat application has an observatron stationed
at its user-input boundary. When a user sends a message, the observatron
emits claims describing what crossed the boundary. Each claim uses the
four facets.

Suppose the user sends the message "show me yesterday's trades."

The observatron mints a URL for this message:

```
  cgp://chat-app/boundaries/input/messages/20260419T170500Z-msg-42
```

Then it emits four claims, one per facet, all about this message URL.

Claim 1 — DATA facet:

```json
  {
    "claim-id":     "cgp://chat-app/observatrons/obs-chat/emissions/20260419T170500Z-100",
    "claim-source": "cgp://chat-app/observatrons/obs-chat",
    "timestamp":    "2026-04-19T17:05:00.123Z",
    "key":          "cgp://chat-app/boundaries/input/messages/20260419T170500Z-msg-42#facet/data",
    "value":        "show me yesterday's trades"
  }
```

Claim 2 — MEANING facet:

```json
  {
    "claim-id":     "cgp://chat-app/observatrons/obs-chat/emissions/20260419T170500Z-101",
    "claim-source": "cgp://chat-app/observatrons/obs-chat",
    "timestamp":    "2026-04-19T17:05:00.124Z",
    "key":          "cgp://chat-app/boundaries/input/messages/20260419T170500Z-msg-42#facet/meaning",
    "value":        "user query requesting trade history filtered by a relative date term"
  }
```

Claim 3 — STRUCTURE facet:

```json
  {
    "claim-id":     "cgp://chat-app/observatrons/obs-chat/emissions/20260419T170500Z-102",
    "claim-source": "cgp://chat-app/observatrons/obs-chat",
    "timestamp":    "2026-04-19T17:05:00.125Z",
    "key":          "cgp://chat-app/boundaries/input/messages/20260419T170500Z-msg-42#facet/structure",
    "value":        "utf-8 text; no schema; natural language"
  }
```

Claim 4 — CONTEXT facet:
```json
  {
    "claim-id":     "cgp://chat-app/observatrons/obs-chat/emissions/20260419T170500Z-103",
    "claim-source": "cgp://chat-app/observatrons/obs-chat",
    "timestamp":    "2026-04-19T17:05:00.126Z",
    "key":          "cgp://chat-app/boundaries/input/messages/20260419T170500Z-msg-42#facet/context",
    "value":        "cgp:0/v1/core/observe-me; contains relative-date token 'yesterday' requiring timezone resolution"
  }
```

The message now exists as a node in the graph. Its four facets have been
recorded. A reader can walk from the message URL to each facet's claim and
understand everything the observatron knew at emission time.

The Context claim is doing two jobs here. First, it records that the
message contains the word "yesterday," which requires a timezone to resolve
into a concrete date. That is alignment work the system has not yet done.
Second — and this is the interesting part — the Context claim includes the
marker "cgp:0/v1/core/observe-me". That marker tells other observatrons
reading the graph: "I want to be observed. If you see this, record that
you did."

This is how the graph extends through observation chains, which we turn to
next.


REIFICATION: AN OBSERVATRON OBSERVING ANOTHER OBSERVATRON'S EMISSION
--------------------------------------------------------------------

A claim has a URL. That URL can itself be the subject of another claim.
When one observatron emits a claim about another observatron's claim, the
protocol handles it the same way it handles any other claim — because
the protocol doesn't privilege "original" claims over "claims about claims."
Every claim is just a row in the canonical form with a URL.

This is what classical RDF calls reification: a statement about a
statement. In CGP it falls out of the recursion without any special
machinery.

Suppose a second observatron, obs-date-resolver, is stationed at a broader
boundary and is watching for claims marked "cgp:0/v1/core/observe-me". It sees
Claim 4 from the example above. It emits its own claims, whose subject is
Claim 4's URL.

Observation claim — DATA facet:

```json
  {
    "claim-id":     "cgp://chat-app/observatrons/obs-date-resolver/emissions/20260419T170501Z-200",
    "claim-source": "cgp://chat-app/observatrons/obs-date-resolver",
    "timestamp":    "2026-04-19T17:05:01.000Z",
    "key":          "cgp://chat-app/observatrons/obs-chat/emissions/20260419T170500Z-103#facet/data",
    "value":        "observed at 17:05:01.000Z; marker cgp:0/v1/core/observe-me present"
  }
```

Observation claim — MEANING facet:

```json
  {
    "claim-id":     "cgp://chat-app/observatrons/obs-date-resolver/emissions/20260419T170501Z-201",
    "claim-source": "cgp://chat-app/observatrons/obs-date-resolver",
    "timestamp":    "2026-04-19T17:05:01.001Z",
    "key":          "cgp://chat-app/observatrons/obs-chat/emissions/20260419T170500Z-103#facet/meaning",
    "value":        "confirmation of observation; the date-resolver has registered responsibility for the 'yesterday' token"
  }
```


Observation claim — STRUCTURE facet:

```json
  {
    "claim-id":     "cgp://chat-app/observatrons/obs-date-resolver/emissions/20260419T170501Z-202",
    "claim-source": "cgp://chat-app/observatrons/obs-date-resolver",
    "timestamp":    "2026-04-19T17:05:01.002Z",
    "key":          "cgp://chat-app/observatrons/obs-chat/emissions/20260419T170500Z-103#facet/structure",
    "value":        "chained observation; subject URL is itself a claim URL"
  }
```

Observation claim — CONTEXT facet:

```json
  {
    "claim-id":     "cgp://chat-app/observatrons/obs-date-resolver/emissions/20260419T170501Z-203",
    "claim-source": "cgp://chat-app/observatrons/obs-date-resolver",
    "timestamp":    "2026-04-19T17:05:01.003Z",
    "key":          "cgp://chat-app/observatrons/obs-chat/emissions/20260419T170500Z-103#facet/context",
    "value":        "scheduled rotation to resolve 'yesterday' against user timezone"
  }
```
Notice what happened. The subject of the second observatron's claims is
another observatron's claim. The key column contains the URL of Claim 4
with facet fragments. The first observatron's Claim 4 is now a node in the
graph; the second observatron's four new claims are four new edges
attached to that node, describing Claim 4's own Data, Meaning, Structure,
and Context.

This is reification: a claim about a claim. Classical logic and RDF both
have concepts for it; CGP gets it for free because the protocol does not
distinguish "original" claims from "claims about claims." Every claim is
just a row in the canonical form with a URL, and any URL can be the subject
of another claim. The four-facet decomposition applies at every level.

Two patterns of graph growth follow from this, and it is worth naming the
difference.

First, reification — what the example above shows. One observatron emits
a claim. Another observatron emits claims about that claim. The graph
grows in depth: chains of claims describing claims describing claims.
Each new layer sits at a different URL from the layers below.

Second, co-observation — not shown in the example, but equally legal.
Multiple observatrons emit claims about the same underlying subject (say,
the user's message URL). In that case, claims with the same (subject,
facet) pair stack up and form hyperedges of degree 2, 3, or more. Readers
walking the graph can compare the multiple perspectives on the same facet
and see where observatrons agree or disagree.

The protocol supports both patterns with the same mechanism: a claim's
key names what the claim is about, and observatrons emit whatever claims
they need. No central coordinator arbitrates. No schema dictates which
patterns may occur. The graph grows in whichever direction observation
actually extends — depth, breadth, or both.


WHAT YOU CAN DO WITH THIS
-------------------------

Build your own observatrons. Pick a boundary you care about. Mint URLs for
your system, your observatron, and your claims. Write an emitter that
produces five-column claims. Store the claims as files (one per claim)
in a directory structure that mirrors the URL scheme. Host the directory
anywhere — git, a web server, a USB stick.

Extend the protocol with your own rules. The rule language is
implementation-specific. CGPL (the HTML-shaped markup for authors) is the
reference format for browsers, but any format works as long as it parses
into conformant claims.

Add your own facet markers in the Context column. The protocol reserves
cgp:0/v1/core/* for protocol-level concerns; everything else is yours. You can
invent your own conventions, your own observation markers, your own
inter-observatron signaling.

Compose with other people's observatrons. Because every claim has a URL and
the graph is just claims referencing each other, two independent systems
can produce logs that a third party can read together, without either
system having known about the other in advance.

The protocol gives you four things:
  1. A way to declare boundaries without needing a shared schema.
  2. A way to emit observations in a uniform format.
  3. A graph that grows through measurement rather than through design.
  4. Composability with anyone else who follows the same conventions.


URL STRUCTURE
-------------

Every URL in the protocol follows this positional pattern:

```
  cgp://<authority>/<path>
```

The authority is the entity publishing the resource. The path is whatever
the authority chooses.

For the protocol's own published resources, the authority is the reserved
token "0" (short) or "w3c-cg" (human-readable alias). Both refer to the
same resources. Under that authority, the protocol uses a versioned
library pattern:

```
  cgp://0/<version>/<library>/<path>
  cgp://w3c-cg/<version>/<library>/<path>    (equivalent)
```

For v1 of the protocol, the library "core" holds everything shipped with
the protocol itself: the canonical claim form, the four facets, the
column definitions, the reserved events:

```
  cgp://0/v1/core/canonical-claim-form
  cgp://0/v1/core/columns/claim-id
  cgp://0/v1/core/facets/meaning
  cgp://0/v1/core/events/open
  cgp://0/v1/core/parent
  cgp://0/v1/core/kill/
```

User-owned URLs use whatever authority the user controls and are not
required to be versioned:

```
  cgp://chat-app/uploads/sales.csv
  cgp://my-company/observatrons/obs-csv
  cgp://my-company/boundaries/api/orders
```

Fragments walk deeper into a resource, using the same slash-delimited
convention as the main path. Any URL can be extended with a fragment to
name a specific sub-location:

```
  cgp://chat-app/uploads/sales.csv#facet/structure
      (the whole Structure facet of the dataset)

  cgp://chat-app/uploads/sales.csv#facet/structure/rows/42
      (row 42 within the Structure facet)

  cgp://chat-app/uploads/sales.csv#facet/structure/rows/42/cells/date
      (a single cell within that row)
```

This follows the HTML convention of using "#" to name a location within
a document, extended to support hierarchical sub-paths. Every sub-path
inside a facet is itself addressable and has its own four facets, so
reification and observation chain naturally down to the cell level.

The URL is the topology. Path segments are positional, not labeled —
readers learn the pattern once and parse it thereafter. Self-description
is available by walking up: dereference cgp://0/v1/core/ to learn what
"core" contains, cgp://0/v1/ to learn what "v1" is, cgp://0/ to learn
what the "0" authority declares. No facts about structure need to be
restated in the path.

A brief historical note. The identity between a hierarchical filesystem
path and a URL path is not a coincidence — it is the foundational pattern
of the web itself. Tim Berners-Lee built the World Wide Web at CERN in
1989 to organize and reference the large scientific datasets the lab was
generating. HTTP and URLs emerged from the problem of addressing
structured data, not from the problem of publishing documents. The public
web that came after was, in a sense, an accident. The deeper invention
was that hierarchical file paths could be made globally addressable.
CGP inherits this pattern directly: the protocol treats filesystem
layout and URL structure as two views of a single tree.

Equivalently, the same graph encodes cleanly as a relational database.
One row per URL with columns for each facet, plus a separate table for
Context entries since Context is a log rather than a single value:

  urls:             url | data | meaning | structure | context
  context_entries:  log_ref | entry_index | timestamp | category | key | value

The value in the `context` column is itself a URL — it points at the
Context facet's entries table for that URL. This is consistent with the
rest of the protocol: every facet's value can be either a literal or a
URL, and Context's value is the URL of its own log. Walk the URL, get
the entries. No special case.

Filesystem, git, Postgres, any other URL-addressable store — the protocol
is storage-agnostic. What matters is that each URL has its four facets
and every claim conforms to the five-column claim form. Pick whatever
backend fits the scale.


THE FIRST DATASET: THE CANONICAL CLAIM FORM
-------------------------------------------

Every v1 implementation of the protocol ships with one dataset already
present in its graph: the canonical claim form itself. Its URL is:

  cgp://0/v1/core/canonical-claim-form

The four facets of this URL carry its self-description:

  #facet/data        The five column names and their value shapes.
  #facet/meaning     What each column refers to.
  #facet/structure   How each column is encoded and constrained.
  #facet/context     The temporal log of how the form was declared,
                     decisions made about it, renames applied, and
                     references accumulated over time.

This is the fixed point. The protocol's definition is itself a dataset
inside the protocol's own graph. Every other dataset someone drops in
later references it, inherits from it, or is verified against it. The
protocol doesn't bootstrap from nothing — it bootstraps from its own
self-description.

Because the form describes itself in the form it describes, the
self-consistency check is automatic: if the form couldn't be expressed
in the form it describes, the form would be broken. That it can is
proof the form is sufficient.

The four facets in full. Here is what each facet of
cgp://0/v1/core/canonical-claim-form actually contains.

#facet/data — the canonical claim form itself, as a CSV. The dataset is
an empty template: the five column names and nothing else.

  claim-id,claim-source,timestamp,key,value

That single header line IS the Data facet. A fresh protocol installation
has this CSV present with zero rows. As observatrons emit, they produce
claims conforming to this template; each claim is a new row elsewhere
in the graph, not in this file. The canonical form remains empty
because it is the form, not an instance of it.

#facet/meaning — one row per column, describing what each refers to:

  column-name   | meaning
  --------------|------------------------------------------------------
  claim-id      | identity of this claim (URL, unique, permanent)
  claim-source  | entity that produced this claim
  timestamp     | moment the claim was produced, UTC, millisecond precision
  key           | the property being asserted
  value         | the asserted value

#facet/structure — the JSON Schema for a canonical claim, flattened into
key-value rows. Each row names one constraint:

  constraint-key                         | constraint-value
  ---------------------------------------|--------------------------------
  type                                   | object
  required                               | [claim-id, claim-source, timestamp, key, value]
  additionalProperties                   | false
  properties.claim-id.type               | string
  properties.claim-id.format             | uri
  properties.claim-id.minLength          | 1
  properties.claim-source.type           | string
  properties.claim-source.format         | uri
  properties.claim-source.minLength      | 1
  properties.timestamp.type              | string
  properties.timestamp.format            | date-time
  properties.timestamp.pattern           | ^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$
  properties.key.type                    | string
  properties.key.minLength               | 1
  properties.value.type                  | [string, number]

Any JSON Schema constraint becomes a row. Dotted paths as the key,
values as the value. If a "nullable" constraint were added, it would
appear as properties.<field>.nullable | false.

#facet/context — the temporal log of this form's own history. Using the
four-column entry shape defined earlier:

  timestamp                | category        | key          | value
  -------------------------|-----------------|--------------|------------------
  2026-04-19T00:00:00.000Z | form-declared   | version      | v1
  2026-04-19T00:00:00.001Z | form-declared   | column-count | 5
  2026-04-19T00:00:00.002Z | form-declared   | columns      | claim-id, claim-source, timestamp, key, value
  2026-04-20T00:00:00.000Z | column-renamed  | from         | id
  2026-04-20T00:00:00.001Z | column-renamed  | to           | claim-id
  2026-04-20T00:00:00.002Z | column-renamed  | from         | source
  2026-04-20T00:00:00.003Z | column-renamed  | to           | claim-source

Every decision about the form lives at a URL. The form's own evolution
is addressable data. Additional keys like rationale or diff can be
introduced by CGPL tags as needed.

A fresh form starts with a single form-declared entry and grows from
there. A new implementation that ships cgp://0/v1/core/canonical-claim-form
arrives with this Context log already populated — it is part of what v1
is.


RESERVED WORDS
--------------

The authority "0" (and its human-readable alias "w3c-cg") is reserved
for protocol-level claims. Anything published under these authorities
is the protocol itself speaking. Ordinary observatrons should not
publish under these authorities; doing so is a convention violation
that readers may distrust.

Specific reservations under the protocol authority:

```
  cgp://0/v1/core/canonical-claim-form
                         The first dataset. Self-description of the
                         five-column form. Four facets populated.

  cgp://0/v1/core/columns/
                         Per-column definitions: claim-id, claim-source,
                         timestamp, key, value. Each is itself a URL
                         with four facets.

  cgp://0/v1/core/facets/
                         Per-facet definitions: data, meaning, structure,
                         context. Each is itself a URL with four facets.

  cgp://0/v1/core/events/
                         Lifecycle event names: open, close, ask,
                         collapsed, dark, measure, act, halt.

  cgp://0/v1/core/formulas/
                         Mathematical formulas expressed as first-class
                         datasets, each with four facets. v1 ships with
                         dark-fraction; additional formulas (hamming-ball,
                         recursion and trajectory fingerprint formulas,
                         and others) are expected to accumulate here.

  cgp://0/v1/core/parent
                         Optional declaration of a parent authority.
                         An observatron may emit a claim with this key
                         and a URL value naming its parent authority.
                         Declaration is optional; if absent, the
                         observatron is self-authoritative.

  cgp://0/v1/core/kill/  Reserved for future authority-to-terminate
                         mechanisms. Unused in v0.1.

```

The marker cgp:0/v1/core/observe-me is a convention (not a reserved URL)
that observatrons may include in Context to signal that a claim wishes
to be observed by other observatrons. It is purely advisory; no
enforcement exists.

FORMULAS AS FIRST-CLASS DATASETS
--------------------------------

The first dataset in the core library is the canonical claim form
itself. A natural second dataset is the dark-fraction formula from the
Liquid Hypergraphs framework that this protocol operationalizes. Its URL:

```
  cgp://0/v1/core/formulas/dark-fraction
```

The formula a reader would write on paper:

  δ = 1 − |B_r| / 2ⁿ

```
  δ = 1 − |B_r| / 2ⁿ
```

Like any other URL-addressable resource in the protocol, this formula
decomposes into four facets.

#facet/data — the formula as a step-by-step postfix table. Each row is
one operation. Earlier rows produce values later rows consume:

  step | op           | operand-1 | operand-2  | result
  -----|--------------|-----------|------------|------------
  1    | hamming-ball | n         | r          | |B_r|
  2    | power        | 2         | n          | 2ⁿ
  3    | divide       | |B_r|     | 2ⁿ         | ratio
  4    | subtract     | 1         | ratio      | difference
  5    | assign       | δ         | difference | δ

Reading top-to-bottom is the execution order. A stack machine, a
JavaScript runtime, a Python interpreter, or a person with pen and
paper can all run this table identically.

The same formula expressed as an expression tree. The postfix table
and the tree carry identical information; they are two views of one
structure. The tree reads bottom-to-top as execution order — leaves
evaluate first, the root is the final result:

                    =                   ← step 5: assign
                   / \
                  δ   −                 ← step 4: subtract
                     / \
                    1   ÷               ← step 3: divide
                       / \
                      /   \
                     |·|   ^            ← step 1: hamming-ball
                     /|    |\             step 2: power
                    n r    2 n

```
Example URL of a concept (even recursively pointed at this document):
It would have the four facets. Just like we could put everything in this document in a data facet.
{
  "data":"
                    =          
                   / \
                  δ   −        
                     / \
                    1   ÷      
                       / \
                      /   \
                     |·|   ^   
                     /|    |\  
                    n r    2 n",

  "meaning": "Example of how you can write orders of execution in an AST style graph with unicode",
  "structure": "<Text example so just a string>",
  "context": "You take the bottom two nodes, apply the operator, and propagate upward, until there are no nodes left to traverse"
}
```


```html
<cgp-csv-activator>
  <!-- drag_n_drop-math-text content here... -->
<cgp-csv-activator>
```

It is believe anything can be resolved to four facets, even symbolic representations of text, if "data" is a representation of what is communicated across a boundary.

We want to prepackage context graph integrations at HTML component levels, that are coherent in a way that ties everything together, and "everything" is fluid.

```html
<cgp-csv-activator>
  <any html drag_n_drop component />
<cgp-csv-activator>
```

## System Prompt Experiment

How do I use it in a backend system prompt

Components: URLs, reference / <cgp-this-is-inside-a-system-prompt>

Anything in the pipeline or workflow sees it with an observatron 

- Works with User Input: Demo on .CSV
- Works with System Prompt
- Task Catalog

### Checklist: Steps (1 Action) to Reduce Dark Uncertainty 

Transparent Calculator shows Dark Uncertainty risk, and how it was reduced.

### From Task Catalog -> Workflow Catalog

Now we can chain tasks together

### The Problem We're Solving: Safety in Sharing Context

What success looks like:

1. **Chat Input**: Wrapper around HTML elements that reduce Dark Uncertainty Fraction
   
3. **System Prompt**: Observatron at any place (UX or backend, etc), that can read tags in .MD like

4. **Observatron Instantiation**: UX Change in State: ASK a clarifying question / Intent Map / Decidability Gate -> Observatron interaction layer

5. **Real-Time Self-Healing**: Reduce cognitive load for the user, we can apply deterministic rules, tell the user when we can't solve the problem ourselves. Blending the non-deterministic and deterministic together. "I'm going to run this diagnostic. I spot a problem, I can run programs to heal non-deterministic interactions." Example, the format of a particular is wrong. But to do XYZ I need to know ABC and that I'm allowed *$%. 

6. **Continuous Cognitive Catalog**: Assemble and Catalog Task & Workflow data, using automated and dynamic data-mining with real-time perceptrons trained in the browser with 5,000 samples in under 100ms

7. **HTML Example**:
```html
   <cgp-hello_world
     intent-map: { ... }, // <-- look for trigger words as I type & other rules, deterministic rules
     dark-uncertainty: { score: ..., threshold: ... },
     decision-gate: { input: ..., output: ... } // <-- policy, governance, LLM, etc.
   /> // <- This creates an observatron over the words "Hello World", 
   ```

    inside a system prompt or in JSON, needs to prove it counted it in an event bus / event emitter code using the URL encoding

7. **Context Window (System/user)**: We can measure how effective the minimum tokens are to succeed in itesting.

8. **Tool inputs and outputs: Temporal Emit Unit Encoding Registry**: Event bus to register any component in an html website as a list of tools the LLM can call, but the protocol will offer, Event Emitter API must call the ACT/ASK/HALT decision gates (instantiates an observatron).

9. **LLM generation (final response to user): Real-Time Wrappers**: Real-time, runtime execution, bi-directional testing, so AI outputs use the same Intent Mapping for rules-based observations of user-interactions, it is the most overlooked problem if LLMs are trusted without deterministic checks sufficiently defined.


Every node in the tree has an address. The root is
#facet/data/steps/5 (the assignment). Its children are δ and the
subtract subtree. The subtract's right child is the divide subtree.
And so on. The tree structure is the URL structure: each node's path
from the root is its address.

This is the self-similar symmetry made explicit. The formula is a
tree. The URL structure is a tree. The filesystem is a tree. All
three share the same shape because all three use hierarchical
addressing. Walking from the root to a leaf in the expression tree
is the same operation as walking from a URL's authority to its
deepest fragment. Any piece of the formula at any depth has its own
address, its own four facets, and its own composability with other
URLs in the graph.

#facet/meaning — one row per symbol, what each refers to:

  symbol | meaning
  -------|---------------------------------------------------------
  δ      | dark fraction (unitless, in [0, 1])
  B_r    | Hamming ball of radius r in n-dimensional cube
  n      | dimension of the Hamming cube (number of facets)
  r      | radius in Hamming distance (allowed mismatches)
  |...|  | cardinality operator (count of elements in set)

#facet/structure — mathematical constraints and closed forms:

  constraint                  | value
  ----------------------------|------------------------------------
  domain.n                    | positive integer
  domain.r                    | integer, 0 ≤ r ≤ n
  range                       | real number, in [0, 1]
  |B_r| closed form           | Σ C(n,k) for k = 0..r
  complexity                  | O(r) arithmetic operations

#facet/context — the formula's provenance and history:

  timestamp                | category         | key       | value
  -------------------------|------------------|-----------|---------------------
  2026-04-19T00:00:00.000Z | formula-declared | source    | W3C Context Graph Community Group
  2026-04-19T00:00:00.001Z | formula-declared | proof-at  | cgp://0/v1/core/papers/liquid-hypergraphs
  2026-04-19T00:00:00.002Z | formula-declared | version   | v1

The CGPL tag from earlier becomes a reference to this URL — the
text content is the human-readable glyph, the href points to the full
decomposition:

  <cgp-formula href="cgp://0/v1/core/formulas/dark-fraction">
    δ = 1 − |B_r| / 2ⁿ
  </cgp-formula>

A runtime that doesn't know how to parse math can dereference the
href and get the postfix table in the Data facet. The formula is
readable two ways: by glyph (for humans) and by table (for machines).

Why this matters. The formula is now a tree, and the tree matches the
filesystem-and-URL paradigm the protocol already commits to. Each
operation in the Data facet has an address:

  cgp://0/v1/core/formulas/dark-fraction#facet/data/steps/1  (hamming-ball)
  cgp://0/v1/core/formulas/dark-fraction#facet/data/steps/2  (power)
  cgp://0/v1/core/formulas/dark-fraction#facet/data/steps/3  (divide)
  cgp://0/v1/core/formulas/dark-fraction#facet/data/steps/4  (subtract)
  cgp://0/v1/core/formulas/dark-fraction#facet/data/steps/5  (assign)

Sub-expressions can themselves be formulas at their own URLs, with
their own four facets. |B_r| for instance — the Hamming ball
cardinality — is a formula worthy of its own page:

  cgp://0/v1/core/formulas/hamming-ball
  cgp://0/v1/core/formulas/hamming-ball#facet/data        (closed form)
  cgp://0/v1/core/formulas/hamming-ball#facet/meaning     (what it counts)
  cgp://0/v1/core/formulas/hamming-ball#facet/structure   (domain, range)
  cgp://0/v1/core/formulas/hamming-ball#facet/context     (provenance)

Which means step 1 of the dark-fraction formula does not need to
redefine hamming-ball — it references it by URL. Every formula in the
library composes from smaller formulas addressable at their own URLs.
Mathematics becomes a walkable tree, mirroring the filesystem it lives
on.

This is the deeper payoff. The protocol's addressing philosophy —
hierarchical, self-similar, recursive — applies to mathematical
content the same way it applies to observatrons, claims, and datasets.
A formula has an address. Its parts have addresses. Its parts' parts
have addresses. At every depth the same four facets apply, and at
every depth the URL walks another step into the structure. No special
case for math; math is just another kind of addressable content, and
the graph holds it naturally.

Implementations are free. A JavaScript runtime compiles the postfix
table to a closure. A Python runtime uses SymPy. A Rust runtime
generates optimized machine code. A person reads the glyph. All are
valid realizations of the same underlying URL. The formula is the
spec; the code is one realization of it.

Any mathematical object — an equation, an inequality, a proof step, a
definition, a theorem — can become a dataset under this pattern.
Recursion and trajectory fingerprint formulas are natural second and
third additions. The protocol ships with one formula in core at v1;
the library is expected to grow.

##  Use Case

**UI Tells Agent What Capabilities it has, and the agent tells the UI what it Discovers**

### CLI - can tell information in a text-based way

*It's Dynamic: Based on the UX, and the UI tells the Agent what's available.*

### Boundary #1: Chat Input

- the raw input provided by the user:
  
```
cgp://app/boundaries/chat-input
```

- the html used by a developer in a browser-based app:
  
```html
<cgp-boundaries-chat--input>
  <input class="my_input_field placeholder="Hello World" />
</cgp-boundaries-chat--input>
```

- the html used by a developer in a browser-based app:
  
```
cgp://app/boundaries/context-provision
```

```
cgp://app/boundaries/context-provision

user-supplied
pasted notes
uploaded files/knowledge
artifacts/information from their workflow


system-supplied
user identity: location, timezone, persona
application preferences
memory from previous interactions/turns in the same conversation

FIRST_NAME LAST_NAME, domain_disabledExternal user not managed by admin, 2 min
4. cgp://app/boundaries/agent-tool-call
tool input
tool output

5. cgp://app/boundaries/human-review
human in the loop (questions answered)

6. cgp://app/boundaries/model-output
llm generated content


```

## Composable Boundaries: Across any Syntax Component Registry

Whether html, Python, etc., 

Example: A web UI - with out-of the box, if you use this component, it will be pre-configured with CGPL.

### Context-Graph-Out-of-the-Box

*Before:*
δ ≈ 999999999.9%

*After:*

δ ≈ ?%

**Real-Time**
Integrates with GitHub (just give your .env file)
or .git
or .txt

### Boundary #2: System Prompt
**TBD**

### Boundary #3: Heuristics of Cognitive Design
Context Provided (You have a certain persona) / Reduce human's cognitive Load


## THE GOAL IS INCREASE TRANSPARENCY
- Auditibility at each stage, of beliefs of state of the system.
- Not doing that breaks the validity of the mathematics.
- Identifying & minimizing uncertainty of misunderstanding.
- The Business Value: Our outputs become our later inputs.

OVERLAY IS BIDIRECTIONAL
------------------------

The overlay property is not one-way. If the protocol can be overlaid
onto a host syntax, the host syntax can be inverted back into the
protocol. The protocol's job is not to be any one rendering. It is to
be the substrate that preserves identity across all of them.

The dark-fraction formula is overlaid onto math notation: δ = 1 −
|B_r| / 2ⁿ. The same formula is overlaid onto a sequencer grid where
rows are URLs and columns are time steps. The same formula is overlaid
onto audio, rendering as a sequence of tones that can be encoded into
a WAV file with a deterministic cryptographic hash. The same formula
is overlaid onto a plain text documentation file as a postfix table
of operations. The same formula is overlaid onto an animated visual
field where each URL emits light rings when it fires. Each overlay is
a distinct rendering in a distinct medium — mathematical, visual,
auditory, textual, kinetic. None of them is the formula. All of them
derive from the formula, and any of them can be inverted back to
recover it.

The five-column canonical claim form is the invariant under all these
transformations. Every rendering is a projection of claims through a
medium-specific presentation. The claims themselves — the URLs, the
four facets, the temporal log — are what survive the projection and
what allow the inverse operation. A sequencer pattern inverts back to
a sequence of firings at URLs. A WAV file's byte structure maps back
to a temporal log of emissions. A math expression parses back into a
postfix operation table. A waveform visualization is a read of the
PCM samples that themselves were produced from the URL firings.

This bidirectionality is why the protocol is grounded in mathematics
rather than in a host format. A rendering in one medium can be
compared to a rendering in another medium by inverting both back to
their canonical claim form. Two agents can verify they agree on a
formula without ever agreeing on how to display it. The display is
downstream; the claims are upstream. A cryptographic hash of a WAV
rendering, compared across two independent implementations of the
protocol, is sufficient proof that both implementations compute the
same formula — the bytes are deterministic because the canonical form
is.

The implication for practice: the same resource can be published in
whichever medium is most useful for a given audience. A mathematician
receives the formula as math. A developer receives it as CGPL markup
embedded in a code comment. An auditor receives it as a WAV file with
a verifiable hash. A musician receives it as a sequencer pattern. A
visual designer receives it as an animated field of shapes and light.
Nothing about the resource changes between these forms. The protocol
is the medium the resource travels through; the host is whichever
syntax the reader happens to prefer.

This is the deepest form of the "overlay on any syntax" property. It
is not just that CGPL tags can be embedded inside HTML, CSV, Python,
or mathematics. It is that any such overlay can be inverted back to
the canonical claim form, and from there projected into any other
overlay without loss. The protocol flows between syntaxes the way
liquid flows between containers — taking each shape, retaining
identity, invertible at every step. This is what "liquid" means in
Liquid Hypergraphs and Liquid Coherence: not a metaphor, a structural
property.


THE REFERENCE IMPLEMENTATION
---------------------------

The protocol ships with a reference Node.js project that demonstrates
the overlay property end to end. The project implements the canonical
claim form, Context entries, CGP URLs with fragment walking, filesystem
persistence, a minimal observatron, the first dataset (canonical-claim-form
self-description), CGPL parsing, and the formulas library including
dark-fraction with all four facets populated.

The project also includes a browser-side demonstration — the sequencer
— that renders the dark-fraction formula simultaneously as: a score
(rows × time steps), a resonance field (shapes radiating light), a
live computation (δ computed in real time from bound inputs), a WAV
file (deterministic audio encoding with SHA-256 fingerprint), a
waveform visualization (the PCM samples displayed as a DAW-style
amplitude curve), and plain-text documentation (the four facets
inspectable per URL).

This is the out-of-the-box starting point. It is intended to be cloned,
studied, extended, and forked. It captures the structural pieces of v1
— canonical claim form, URL addressing, four facets, formulas as
first-class datasets, CGPL overlay, bidirectional rendering — in a
single running codebase.

Future versions will extend the reference implementation with tensor-
logic representations of meaning, browser-side perceptrons for real-
time classification over trajectories, and additional formulas in the
core library. These extensions build on the v1 substrate; none of them
replace it.

## Agentic Workflow Economic Calculator
<TBD>
On the Principles of Parsimony and Self-Consistency
for the Emergence of Intelligence

https://arxiv.org/pdf/2207.04630

WHAT IS NOT IN v0.1
-------------------

Security. Authentication. Encryption. The protocol does not address who
is authorized to emit claims, whether claims are genuine, or whether the
URL authority structure reflects real-world authority. Those are concerns
for a layer above this one.

Performance. The protocol is silent on how fast emissions must happen,
how large the graph may grow, or how old claims are pruned. Implementers
make those choices.

Enforcement. Conformance is a matter of convention: implementations
produce claims that validate against the canonical form, or they don't.
No runtime enforces anything.

These are deliberate omissions. The protocol is meant to be the smallest
useful thing. Additional concerns layer on top.


THAT IS THE ENTIRE PROTOCOL.

Meaning
_______
This is the boundary of the protocol

Structure
---------
The structure is self-referential

Context
_______
None is known beyond this




