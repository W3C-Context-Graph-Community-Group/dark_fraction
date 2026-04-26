import * as THREE from 'three';

const _Z = new THREE.Vector3(0, 0, 1);

export const WIRE_TYPES = [
  { type: 'channel',   color: 0x4a90d9, label: 'Channel'   },
  { type: 'source',    color: 0x50c878, label: 'Source'     },
  { type: 'timestamp', color: 0xf5a623, label: 'Timestamp'  },
  { type: 'key',       color: 0xe74c3c, label: 'Key'        },
  { type: 'value',     color: 0xc084fc, label: 'Value'      },
];

export class WireRenderer {
  /**
   * @param {Object} opts
   * @param {string} opts.type         — wire type name (e.g. 'channel')
   * @param {number} opts.slotIndex    — 0–4, determines plug position on ring
   * @param {THREE.Vector3} opts.ringPosition — ring center in pivot-local space
   * @param {THREE.Vector3} opts.ringNormal   — ring normal (spike direction)
   * @param {number} opts.ringRadius   — radius of the ring
   * @param {number} [opts.color]      — override default color
   * @param {number} [opts.loopRadius=0.04]
   * @param {number} [opts.tubeRadius=0.002]
   * @param {number} [opts.opacity=0.9]
   */
  constructor({ type, slotIndex, ringPosition, ringNormal, ringRadius,
                color, loopRadius = 0.04, tubeRadius = 0.002, opacity = 0.9 }) {
    const def = WIRE_TYPES.find(w => w.type === type) || WIRE_TYPES[slotIndex] || WIRE_TYPES[0];
    this._type       = def.type;
    this._label      = def.label;
    this._slotIndex  = slotIndex;
    this._ringPos    = ringPosition;
    this._ringNormal = ringNormal;
    this._ringRadius = ringRadius;
    this._color      = color ?? def.color;
    this._loopRadius = loopRadius;
    this._tubeRadius = tubeRadius;
    this._opacity    = opacity;
    this._mesh       = null;
  }

  get mesh()  { return this._mesh; }
  get type()  { return this._type; }
  get label() { return this._label; }

  build() {
    const theta = this._slotIndex * (2 * Math.PI / 5);

    // Radial direction at plug point (in ring-local frame, ring lies in XY)
    const radialDir = new THREE.Vector3(Math.cos(theta), Math.sin(theta), 0);
    // Axial direction is Z in ring-local frame
    const axialDir = new THREE.Vector3(0, 0, 1);

    // Plug point in ring-local frame
    const plugLocal = radialDir.clone().multiplyScalar(this._ringRadius);

    // Build loop points in ring-local frame
    const numPts = 64;
    const localPts = [];
    for (let i = 0; i < numPts; i++) {
      const t = (i / numPts) * 2 * Math.PI;
      const radialOffset  = this._loopRadius * Math.sin(t) * 0.4;
      const axialOffset   = this._loopRadius * (1 - Math.cos(t)) * 0.5;

      const pt = plugLocal.clone()
        .addScaledVector(radialDir, radialOffset)
        .addScaledVector(axialDir, axialOffset);
      localPts.push(pt);
    }

    // Transform local points to world (pivot-local) space via ring quaternion + position
    const quat = new THREE.Quaternion().setFromUnitVectors(_Z, this._ringNormal);
    const worldPts = localPts.map(p => p.applyQuaternion(quat).add(this._ringPos));

    const curve = new THREE.CatmullRomCurve3(worldPts, true);
    const geo = new THREE.TubeGeometry(curve, 128, this._tubeRadius, 8, true);
    const mat = new THREE.MeshBasicMaterial({
      color:       this._color,
      transparent: this._opacity < 1,
      opacity:     this._opacity,
    });

    this._mesh = new THREE.Mesh(geo, mat);
    return this._mesh;
  }

  dispose() {
    if (!this._mesh) return;
    this._mesh.geometry.dispose();
    this._mesh.material.dispose();
    this._mesh = null;
  }
}
