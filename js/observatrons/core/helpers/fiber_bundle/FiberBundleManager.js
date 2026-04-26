import { RingRenderer } from './helpers/RingRenderer.js';
import { WireRenderer, WIRE_TYPES } from './helpers/WireRenderer.js';

// ============================================================
// FiberBundleManager — facade for all fiber-bundle visuals
//
// The app shell talks only to this class; helper classes inside
// ./helpers/ do the actual rendering work.
// ============================================================

export class FiberBundleManager {
  /**
   * @param {object}        opts
   * @param {THREE.Group}   opts.pivot        — the observatron pivot group
   * @param {function(number): object|null} opts.getSpikeInfo — obs.getSpikeInfo bound ref
   */
  constructor({ pivot, getSpikeInfo }) {
    this._pivot        = pivot;
    this._getSpikeInfo = getSpikeInfo;
    this._ring         = null;   // RingRenderer | null
    this._wires        = [];     // WireRenderer[]
  }

  // ── Ring ──────────────────────────────────────

  showRing(spikeIndex = 0) {
    this.hideRing();
    const info = this._getSpikeInfo(spikeIndex);
    if (!info) return;
    this._ring = new RingRenderer({ position: info.apex, normal: info.direction });
    this._pivot.add(this._ring.build());
  }

  hideRing() {
    if (!this._ring) return;
    this._pivot.remove(this._ring.mesh);
    this._ring.dispose();
    this._ring = null;
  }

  get ringVisible() {
    return this._ring !== null;
  }

  // ── Wires ────────────────────────────────────

  showWires(spikeIndex = 0) {
    this.hideWires();
    const info = this._getSpikeInfo(spikeIndex);
    if (!info) return;

    const ringRadius = this._ring ? this._ring._radius : 0.03;

    for (let i = 0; i < WIRE_TYPES.length; i++) {
      const wr = new WireRenderer({
        type:         WIRE_TYPES[i].type,
        slotIndex:    i,
        ringPosition: info.apex.clone(),
        ringNormal:   info.direction.clone(),
        ringRadius,
      });
      wr.build();
      this._pivot.add(wr.mesh);
      this._wires.push(wr);
    }
  }

  hideWires() {
    for (const wr of this._wires) {
      this._pivot.remove(wr.mesh);
      wr.dispose();
    }
    this._wires = [];
  }

  get wiresVisible() {
    return this._wires.length > 0;
  }

  // ── Lifecycle ─────────────────────────────────

  dispose() {
    this.hideWires();
    this.hideRing();
  }
}
