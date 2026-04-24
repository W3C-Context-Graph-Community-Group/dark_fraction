# Spike Height — What the Roadmap Says vs. What the Code Does

## What the Roadmap Says

> "Each spike is still a **full tetrahedron** geometrically, with Data as the base plugged into a channel and Meaning, Structure, and Context **rising** as the three elevated faces."

The spike is always a full tetrahedron. All spikes are geometrically identical — same shape, same height. The three elevated faces are always present. Verification status changes the *state* of each face (dark vs verified), not the spike's geometry.

This is consistent across the roadmap:

- "A spike is the tetrahedron that forms when an anchor plugs into a channel."
- "Geometrically: the anchor is the base of the tetrahedron (pressed flat against the observatron's surface); the other three facets are the three elevated faces rising above it."
- "Uncertainty can only accumulate along those three elevated dimensions."

None of these passages describe height variation. The tetrahedron is a fixed shape. What varies is *which faces are dark*.

## What the Code Does (current implementation)

The code varies spike height based on verification status:

```js
const mag = vecMag(sp.v);       // sp.v = [1, mBit, sBit, cBit]
const hTetra = baseHeightRef * mag * 1.15;
```

This produces 4 discrete heights depending on how many facets are verified. An unverified spike (mag = 1.0) is half the height of a fully verified spike (mag = 2.0). **This contradicts the roadmap's "full tetrahedron" language.**

## The Discrepancy

The roadmap says all spikes are geometrically identical. The code makes them different heights. One of them is wrong, or height needs a protocol-level justification that doesn't currently exist.

---

## Two Candidate Justifications for Variable Height

If we decide that variable height is desirable despite the "full tetrahedron" language, here are two protocol-grounded candidates to justify it. Both would require updating the roadmap to acknowledge that spike geometry is not fixed.

### Candidate A: Verification Magnitude

**What it encodes.** How many of the three elevated facets (Meaning, Structure, Context) are populated.

**How it works.** The 4D vector `[1, m, s, c]` produces a Euclidean magnitude that scales height.

| Facets verified | Vector | Magnitude | Height (relative) |
|---|---|---|---|
| None (Data only) | [1, 0, 0, 0] | 1.00 | baseline |
| +Meaning | [1, 1, 0, 0] | 1.41 | +41% |
| +M +S | [1, 1, 1, 0] | 1.73 | +73% |
| All three | [1, 1, 1, 1] | 2.00 | +100% |

**For.**
- Directly tied to the δ formula (each verified facet moves r).
- Readable at a glance: tall = well-verified, short = dark.
- Already implemented.

**Against.**
- Only 4 discrete levels.
- Contradicts "full tetrahedron" — an unverified spike looks like half a tetrahedron.
- Conflates "populated at all" with "meaningfully populated." One placeholder row in `/meaning` makes the spike the same height as a richly annotated one.

### Candidate B: Row Count Across Facets

**What it encodes.** The total number of rows across all four columnar facets.

**How it works.** Sum the array lengths of `/data` (always 1), `/meaning`, `/structure`, and `/context`.

| State | /data | /meaning | /structure | /context | Total | Height |
|---|---|---|---|---|---|---|
| Just anchored | 1 | 0 | 0 | 0 | 1 | minimal |
| Meaning added | 1 | 2 | 0 | 0 | 3 | low |
| Fully annotated | 1 | 3 | 4 | 1 | 9 | medium |
| Heavy context | 1 | 3 | 4 | 50 | 58 | tall |

**For.**
- Continuous — richer visual information than 4 levels.
- Reflects actual data substance, not just binary presence.
- Natural interpretation: taller spike = more content behind it.

**Against.**
- Dominated by `/context` growth. A column with 100 context rows but no meaning/structure is tall but maximally dark — the visual and the score disagree.
- Requires normalization (log-scaling or clamping).
- Less directly tied to δ. The formula operates on binary verification, not row counts.

---

## Comparison

| Criterion | A: Verification Magnitude | B: Row Count |
|---|---|---|
| Tied to δ | Directly | Indirectly |
| Visual resolution | 4 levels | Continuous |
| Reflects data volume | No | Yes |
| Risk of misleading | Low (tall = verified) | Moderate (tall = active ≠ verified) |
| Matches roadmap geometry | No (variable height) | No (variable height) |

---

## Option C: Fixed Height (match the roadmap)

Make all spikes the same height. Encode verification status purely through face color — dark faces for unverified, lit/glowing faces for verified. This is what the roadmap describes.

**For.**
- Matches the spec exactly. No roadmap update needed.
- Simpler geometry. The visual complexity is in color, not shape.
- Eliminates the "which dimension does height encode?" question entirely.

**Against.**
- Loses a visual channel. Height is a powerful perceptual cue; making all spikes the same wastes it.
- Harder to read at a glance. Color differences between spike faces are subtler than height differences between spikes.

---

## Open Questions

1. Should the roadmap's "full tetrahedron" language be taken literally (all spikes identical), or is variable height an acceptable visualization liberty?
2. If height varies, which candidate justifies it? Or should height encode something not yet in the protocol (e.g., row count), which would then need to be added to the spec?
3. If height is fixed, should a different visual channel (width, glow, opacity) encode verification or row count instead?
4. Should the bounding cube resize dynamically to contain all spikes, or should spikes be clamped to fit a fixed cube?

---

## MVP Status

Current implementation uses Candidate A (verification magnitude). Multi-regime λ-dependent height and ρ as a third axis are deferred to post-MVP. The spec's "full tetrahedron" language will be reconciled when λ becomes operational.
