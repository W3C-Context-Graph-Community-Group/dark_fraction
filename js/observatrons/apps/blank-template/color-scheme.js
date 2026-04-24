import * as THREE from 'three';

const PRESETS = {
  default: {
    regionColor(delta) {
      const d = Math.max(0, Math.min(1, delta));
      return new THREE.Color(d, 0, 1 - d);
    },
    spikeColor(frac) {
      const f = Math.max(0, Math.min(1, frac));
      return new THREE.Color(1 - f, 0.05, f);
    },
    emptyColor: 0x202035,
  },

  heat: {
    regionColor(delta) {
      const d = Math.max(0, Math.min(1, delta));
      // black -> orange -> yellow
      return new THREE.Color(d, d * 0.55, d * d * 0.1);
    },
    spikeColor(frac) {
      const f = Math.max(0, Math.min(1, frac));
      return new THREE.Color(0.9, 0.2 + f * 0.6, f * 0.15);
    },
    emptyColor: 0x1a1008,
  },

  ice: {
    regionColor(delta) {
      const d = Math.max(0, Math.min(1, delta));
      // dark-blue -> cyan -> white
      return new THREE.Color(0.15 + d * 0.85, 0.2 + d * 0.8, 0.4 + d * 0.6);
    },
    spikeColor(frac) {
      const f = Math.max(0, Math.min(1, frac));
      return new THREE.Color(0.3 + f * 0.7, 0.6 + f * 0.4, 0.8 + f * 0.2);
    },
    emptyColor: 0x0a1520,
  },

  mono: {
    regionColor(delta) {
      const d = Math.max(0, Math.min(1, delta));
      const g = 0.15 + d * 0.7;
      return new THREE.Color(g, g, g);
    },
    spikeColor(frac) {
      const f = Math.max(0, Math.min(1, frac));
      const g = 0.3 + f * 0.6;
      return new THREE.Color(g, g, g);
    },
    emptyColor: 0x1a1a1a,
  },
};

export class ColorScheme {
  constructor(name = 'default') {
    this._name = name;
    this._preset = PRESETS[name] || PRESETS.default;
    this.onChange = null;
  }

  get name() { return this._name; }

  static get presets() { return Object.keys(PRESETS); }

  set(name) {
    if (!PRESETS[name]) throw new Error(`ColorScheme: unknown preset "${name}"`);
    this._name = name;
    this._preset = PRESETS[name];
    if (this.onChange) this.onChange(name);
  }

  regionColor(delta) {
    return this._preset.regionColor(delta);
  }

  spikeColor(verifiedFrac) {
    return this._preset.spikeColor(verifiedFrac);
  }

  get emptyColor() {
    return this._preset.emptyColor;
  }
}
