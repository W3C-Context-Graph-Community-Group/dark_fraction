import { RingRenderer } from './helpers/RingRenderer.js';
import { WireRenderer, WIRE_TYPES } from './helpers/WireRenderer.js';
import { ConnectionTracker } from './helpers/ConnectionTracker.js';

// ============================================================
// FiberBundleManager — facade for all fiber-bundle visuals
//
// The app shell talks only to this class; helper classes inside
// ./helpers/ do the actual rendering work.
// ============================================================

function lerp(a, b, t) { return a + (b - a) * t; }
function lerpColor(a, b, t) {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(lerp(ar, br, t));
  const g = Math.round(lerp(ag, bg, t));
  const blue = Math.round(lerp(ab, bb, t));
  return (r << 16) | (g << 8) | blue;
}

export class FiberBundleManager {
  /**
   * @param {object}        opts
   * @param {THREE.Group}   opts.pivot        — the observatron pivot group
   * @param {function(number): object|null} opts.getSpikeInfo — obs.getSpikeInfo bound ref
   * @param {string}        [opts.observatronAddress=''] — CGP address for tracking
   */
  constructor({ pivot, getSpikeInfo, observatronAddress = '' }) {
    this._pivot        = pivot;
    this._getSpikeInfo = getSpikeInfo;
    this._rings        = [];     // RingRenderer[]
    this._wires        = [];     // WireRenderer[]
    this._tracker      = new ConnectionTracker(observatronAddress);
  }

  get tracker() { return this._tracker; }

  // ── Paired rings ───────────────────────────────

  showPairs(startIndex, pairCount = 1) {
    this.hidePairs();

    const wireTypes = WIRE_TYPES.map(w => w.type);

    // Phase 1: create all rings (pairCount + 1 total) with directional coloring
    const infos = [];
    for (let i = startIndex; i <= startIndex + pairCount; i++) {
      const info = this._getSpikeInfo(i);
      if (!info) break;

      const j = i - startIndex;
      const t = pairCount > 0 ? j / pairCount : 0;

      // Interpolate ring appearance from source (white/emissive) to receiver (dark/matte)
      const color             = lerpColor(0xffffff, 0x222222, t);
      const emissive          = lerpColor(0xffffff, 0x000000, t);
      const emissiveIntensity = lerp(0.15, 0, t);
      const shininess         = lerp(60, 5, t);

      const ring = new RingRenderer({
        position: info.apex,
        normal: info.direction,
        color,
        emissive,
        emissiveIntensity,
        shininess,
      });
      this._pivot.add(ring.build());
      this._rings.push(ring);
      infos.push({ info, ring });
    }

    // Phase 2: bridge wires between consecutive rings with luminosity fade
    for (let j = 0; j < infos.length - 1; j++) {
      const { info: infoA, ring: ringA } = infos[j];
      const { info: infoB, ring: ringB } = infos[j + 1];

      const lumStart = 1.0 - 0.3 * (j / pairCount);
      const lumEnd   = 1.0 - 0.3 * ((j + 1) / pairCount);

      this._showBridgeWires(infoA, ringA, infoB, ringB, lumStart, lumEnd);
      this._tracker.connect(startIndex + j, startIndex + j + 1, wireTypes);
    }
  }

  hidePairs() {
    this._hideWires();
    for (const ring of this._rings) {
      this._pivot.remove(ring.mesh);
      ring.dispose();
    }
    this._rings = [];
    this._tracker.clear();
  }

  get pairVisible() {
    return this._rings.length > 0;
  }

  // ── Backward-compat pass-throughs ──────────────

  showRing(spikeIndex = 0) { this.showPairs(spikeIndex); }
  hideRing()               { this.hidePairs(); }
  get ringVisible()        { return this.pairVisible; }
  showWires()              { /* wires are now created automatically by showPairs */ }
  hideWires()              { this._hideWires(); }
  get wiresVisible()       { return this._wires.length > 0; }

  // ── Internal ───────────────────────────────────

  _showBridgeWires(infoA, ringA, infoB, ringB, lumStart, lumEnd) {
    const radiusA = ringA._radius;
    const radiusB = ringB._radius;

    for (let i = 0; i < WIRE_TYPES.length; i++) {
      const wr = new WireRenderer({
        type:               WIRE_TYPES[i].type,
        slotIndex:          i,
        ringPosition:       infoA.apex.clone(),
        ringNormal:         infoA.direction.clone(),
        ringRadius:         radiusA,
        targetRingPosition: infoB.apex.clone(),
        targetRingNormal:   infoB.direction.clone(),
        targetRingRadius:   radiusB,
        luminosityStart:    lumStart,
        luminosityEnd:      lumEnd,
      });
      wr.build();
      this._pivot.add(wr.mesh);
      this._wires.push(wr);
    }
  }

  _hideWires() {
    for (const wr of this._wires) {
      this._pivot.remove(wr.mesh);
      wr.dispose();
    }
    this._wires = [];
  }

  // ── Lifecycle ─────────────────────────────────

  dispose() {
    this.hidePairs();
  }
}
