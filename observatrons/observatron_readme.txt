Observatron Controls — What You're Looking At
An observatron is a CGP node stationed at a boundary. It's the unit that watches events cross that boundary and records them as a structured graph. This page is a control surface for exploring one observatron in isolation — every slider drives a specific property of the observatron's state, and the sphere visualizes that state in real time.
The observatron has four addressable dimensions, each with its own URL slot in the Context Graph Protocol: channels, events, anchors, and paths. The first four sliders correspond to these dimensions directly.

The four protocol dimensions
Channels
What it controls: How many channels the observatron has.
What a channel is: A typed aperture on the observatron's surface — a region that receives events of a specific kind. Each channel is like a typed opening on the sphere, shaped to accept only events of its kind. A CSV-drop observatron might have one channel (state-change); a more sophisticated observatron might have several (file-dropped, button-clicked, text-entered).
What you'll see: Increasing the channel count divides the sphere's surface into more distinct regions, each colored and outlined. Each region is one channel's territory. Every spike on the sphere lives within exactly one channel's region.
The math: Channels are a spatial coordinate on the observatron. Different channels occupy different positions on the sphere. They're orthogonal to events (time), anchors (content), and paths (structure).
Events
What it controls: How many events have fired on each channel.
What an event is: One occurrence of the channel's kind. If the channel is csv-drop, each event is one drop action — one time a user dragged files onto the drop target. Events accumulate over time within their channel.
What you'll see: More events per channel means more spikes in that channel's region. Each event contributes its own anchors and paths, which render as additional spikes.
The math: Events are a temporal coordinate. They accumulate along time within a channel. The URL syntax c/<channel>/<event-n> is a coordinate pair, not a hierarchy — the channel names where the observation happened, and event-n names when.
Anchors
What it controls: How many anchors each event has.
What an anchor is: One file, one message, one payload. A single event can produce multiple anchors if multiple things arrive in the same gesture — dropping three CSVs in one drag action produces one event with three anchors.
What you'll see: More anchors per event means more spike groups within each event's sub-cluster. Anchors are the substance of an observation — they're what the event brought.
The math: Anchors are a content coordinate. They nest under their event in the URL (a/<anchor-n>), with each anchor having its own four facets (Data, Meaning, Structure, Context).
Paths
What it controls: How many paths each anchor contains.
What a path is: One addressable leaf within an anchor — one column of a CSV, one field of a JSON object, one slot in a form. Each path is a spike in its own right, with its own four facets.
What you'll see: More paths per anchor means more spikes emerging from each anchor's position. Paths are the finest-grained observations — they're what the protocol can address and measure at the leaf level.
The math: Paths are a structural coordinate. They nest under their anchor in the URL (p/<path-n>). Each path is what δ (the dark fraction) is computed against — how many of its three facets (Meaning, Structure, Context) have been verified.

The viewing controls
These don't change what the observatron is. They change what you're looking at.
Zoom
What it controls: Camera distance from the observatron.
What you'll see: Closer views reveal spike geometry and the fiber bundle structure. Farther views let you see the whole sphere and its channel regions at once.
Rotation (Yaw / Pitch / Roll)
What it controls: The observatron's orientation in 3D space.
What you'll see: The observatron rotates to show you its other side. Spikes, channel regions, and fiber bundles all rotate together as rigid geometry. This is useful for seeing channels on the back of the sphere.
Visible Ch.
What it controls: Which channels render their fiber bundles.
What a fiber bundle is: A cable of five colored strands connecting one spike to another within the same channel. Each strand represents one column of the Context Graph Protocol's canonical claim form:

Channel (soft blue) — which kind of observation this claim is
Source (soft green) — which node produced the claim
Timestamp (soft yellow) — when the claim was made
Key (soft orange) — what part of the facet the claim is about
Value (soft pink) — what the claim asserts

The bundle runs between two spikes along a non-tangling curve (mathematically: a spinor-interpolated geodesic on SU(2)). Multiple bundles can share the sphere without their strands knotting, because the interpolation happens in a simply-connected manifold.
Why it's a filter: At six channels with many spikes each, the number of fiber bundles grows combinatorially — up to 50 bundles per channel, with 5 strands each. That's visually overwhelming. The Visible Ch. slider lets you focus on one channel at a time (or a range of channels), seeing its internal structure clearly while other channels still show their spikes and caps but no bundles.
Default: 0–0 shows only the first channel's bundles. Move the range to inspect other channels.
Color Scheme
What it controls: How the observatron's surfaces are colored.

Default — vivid, high-contrast. Good for presentations.
Heat — red-to-blue mapping by δ. High δ channels glow red (lots of dark uncertainty); verified channels cool to blue.
Ice — cool palette. Useful for trajectory analysis.
Mono — monochromatic grays and whites. Cleanest for reading geometry without color distraction.

Color encodes information additively. The geometry alone communicates the protocol structure; color layers semantic meaning on top.

The dark fraction readout
At the top of the control panel, you'll see a small bar labeled with δ values:
δ 0 verified [■■■■■■] 1 dark
This shows the observatron's average dark fraction across all its spikes. δ ranges from 0 (every facet verified, no uncertainty) to 1 (nothing verified, maximum uncertainty). Most real observatrons live somewhere in between.
Each spike has its own δ, computed from how many of its three non-anchor facets (Meaning, Structure, Context) have been verified. The observatron's aggregate δ is the average across all spikes, weighted by their contribution to the boundary's configuration space.
Spike height encodes δ: Taller spikes have more dark uncertainty. Short spikes are well-verified. The sphere's surface and the spike heights together tell you at a glance which observations are grounded and which are still floating.

How to read the sphere
Put it all together and the sphere tells a specific story:

Spheres with large regions and tall spikes: Observatrons with heavy traffic on a few channels, much of it unverified.
Spheres with many small regions: Observatrons with diverse channel types, each modestly active.
Spheres bristling with short, verified spikes: Well-grounded observatrons where most observations have been resolved.
Spheres with many fiber bundles running between spikes: Observatrons performing self-comparison — where facets are being compared to each other as part of internal consistency checks.

Every visual property carries protocol meaning. Nothing is decorative. If you can see it on the sphere, it encodes something addressable, measurable, and URL-referenced in the Context Graph.

Further reading
For the full protocol specification, see the CGP Getting Started Guide. Key concepts referenced here:

The four-facet model (Data, Meaning, Structure, Context)
Dark fraction formula — δ = 1 − |B_r| / 2ⁿ
URL schema — cgp:/s/<system>/o/<observatron>/c/<channel>/<event-n>/a/<anchor>/p/<path>
Canonical claim form — the five-column atomic unit of CGP
Fiber bundles and SU(2) connections — the math of non-tangling comparisons