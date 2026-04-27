import * as THREE from 'three';
import { ObservatronChannelManager } from '../../channel-manager.js';
import { SpikeBuilder } from '../spike-builder.js';
import { disposeGroup, OBS_RADIUS } from '../math-utils.js';

const CELL_SPACING = OBS_RADIUS * 3.0 + 0.3; // 1.8 units

/**
 * NetworkManager — manages N observatron mesh groups inside the existing pivot.
 * Each node gets its own channel manager, geometry, bounding box, and HTML label.
 */
export class NetworkManager {
  /**
   * @param {object} opts
   * @param {THREE.Group} opts.pivot
   * @param {THREE.Camera} opts.camera
   * @param {object} opts.colorScheme
   * @param {number} opts.baseSeed
   */
  constructor({ pivot, camera, colorScheme, baseSeed }) {
    this._pivot = pivot;
    this._camera = camera;
    this._colorScheme = colorScheme;
    this._baseSeed = baseSeed;

    /** @type {{ group: THREE.Group, box: THREE.LineSegments, label: HTMLDivElement }[]} */
    this._nodes = [];
    this._gridActive = false;
    this._count = 0;
  }

  /**
   * Build or remove node groups to reach count `n`.
   * When n === 0 (or 1 from blank-template perspective), disposes everything.
   * @param {number} n
   * @param {object} [ranges] — { channelsRange, eventsRange, anchorsRange, pathsRange }
   */
  setCount(n, ranges = {}) {
    // tear down existing nodes
    this._disposeNodes();

    this._count = n;
    if (n <= 0) return;

    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const overlay = document.getElementById('overlay');

    for (let i = 0; i < n; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);

      // center grid at origin
      const x = (col - (cols - 1) / 2) * CELL_SPACING;
      const y = ((rows - 1) / 2 - row) * CELL_SPACING;

      // build channel manager + geometry for this node
      const chMgr = new ObservatronChannelManager({ systemId: '0', observatronId: String(i) });
      chMgr.seed(this._baseSeed + i, {
        channelsRange: ranges.channelsRange ?? null,
        eventsRange:   ranges.eventsRange   ?? null,
        anchorsRange:  ranges.anchorsRange  ?? null,
        pathsRange:    ranges.pathsRange    ?? null,
      });

      const { spikes, regionStats } = SpikeBuilder.deriveSpikes(chMgr);
      const meshGroup = new THREE.Group();

      if (spikes.length > 0) {
        const { channels, dirs, channelSpikeIndices } = SpikeBuilder.computeLayout(spikes, regionStats);
        SpikeBuilder.buildGeometry(meshGroup, spikes, regionStats, dirs, channels, this._colorScheme);
      } else {
        SpikeBuilder.buildGeometry(meshGroup, spikes, regionStats, [], [], this._colorScheme);
      }

      // wrap in positioned group
      const nodeGroup = new THREE.Group();
      nodeGroup.position.set(x, y, 0);
      nodeGroup.add(meshGroup);

      // bounding box (same style as SceneManager.bgCube)
      const BOX_SIZE = OBS_RADIUS * 3.0;
      const cubeGeo = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
      const cubeEdges = new THREE.EdgesGeometry(cubeGeo);
      const box = new THREE.LineSegments(cubeEdges,
        new THREE.LineBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.5 })
      );
      box.visible = this._gridActive && n > 1;
      nodeGroup.add(box);
      cubeGeo.dispose();

      this._pivot.add(nodeGroup);

      // HTML label
      const label = document.createElement('div');
      label.className = 'network-label';
      label.textContent = String(i);
      if (overlay) overlay.appendChild(label);

      this._nodes.push({ group: nodeGroup, box, label });
    }
  }

  /** Toggle bounding-box visibility (only shown when count > 1). */
  set gridActive(v) {
    this._gridActive = v;
    for (const node of this._nodes) {
      node.box.visible = v && this._count > 1;
    }
  }

  get gridActive() { return this._gridActive; }

  /** Project each node's position to screen coords and update label positions. */
  updateLabels() {
    for (const node of this._nodes) {
      const pos = new THREE.Vector3();
      node.group.getWorldPosition(pos);
      // offset label below the node
      pos.y -= OBS_RADIUS * 1.6;

      pos.project(this._camera);
      const x = (pos.x * 0.5 + 0.5) * innerWidth;
      const y = (-pos.y * 0.5 + 0.5) * innerHeight;
      node.label.style.left = x + 'px';
      node.label.style.top = y + 'px';
      node.label.style.transform = 'translate(-50%, 0)';
    }
  }

  /** Returns { worldW, worldH } large enough to fit all nodes. */
  computeViewExtent() {
    if (this._count <= 1) return { worldW: 2.5, worldH: 2.2 };

    const cols = Math.ceil(Math.sqrt(this._count));
    const rows = Math.ceil(this._count / cols);

    const worldW = cols * CELL_SPACING + 1.0;
    const worldH = rows * CELL_SPACING + 1.0;
    return { worldW, worldH };
  }

  /** Clean up all nodes. */
  dispose() {
    this._disposeNodes();
  }

  _disposeNodes() {
    for (const node of this._nodes) {
      this._pivot.remove(node.group);
      disposeGroup(node.group);
      if (node.label.parentNode) node.label.parentNode.removeChild(node.label);
    }
    this._nodes = [];
    this._count = 0;
  }
}
