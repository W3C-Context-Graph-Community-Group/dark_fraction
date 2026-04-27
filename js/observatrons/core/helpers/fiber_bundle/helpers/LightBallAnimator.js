import * as THREE from 'three';
import { FiberPathSolver } from './FiberPathSolver.js';
import { WIRE_TYPES } from './WireRenderer.js';

/**
 * Drives a glowing ball of light from source ring to target ring
 * along a fiber path resolved by FiberPathSolver.
 */
export class LightBallAnimator {
  /**
   * @param {object} opts
   * @param {THREE.Group}  opts.pivot            — group to add ball meshes into
   * @param {Map}          opts.connections       — FiberBundleManager._connections (shared reference)
   * @param {function}     opts.resolveEndpoint   — (nodeId, spikeIndex) => { direction, apex, base }
   */
  constructor({ pivot, connections, resolveEndpoint }) {
    this._pivot           = pivot;
    this._connections     = connections;
    this._resolveEndpoint = resolveEndpoint;
    this._animations      = new Map(); // connectionId → animation state
  }

  /**
   * Start animating a light ball along a connection's fiber path.
   * @param {string} connectionId
   * @param {string} [wireType='channel']
   */
  startOnConnection(connectionId, wireType = 'channel') {
    if (this._animations.has(connectionId)) return;

    const conn = this._connections.get(connectionId);
    if (!conn) return;

    const infoA = this._resolveEndpoint(conn.source.nodeId, conn.source.spikeIndex);
    const infoB = this._resolveEndpoint(conn.target.nodeId, conn.target.spikeIndex);
    if (!infoA || !infoB) return;

    // Derive ring radii from the existing RingRenderer instances
    const radiusA = conn.rings[0] ? conn.rings[0]._radius : 0.03;
    const radiusB = conn.rings.length > 1 ? conn.rings[conn.rings.length - 1]._radius : 0.03;

    const fiberPath = FiberPathSolver.resolveSingleFiber(wireType, {
      position: infoA.apex,
      normal:   infoA.direction,
      radius:   radiusA,
    }, {
      position: infoB.apex,
      normal:   infoB.direction,
      radius:   radiusB,
    });

    if (!fiberPath) return;

    // Look up wire color
    const wt = WIRE_TYPES.find(w => w.type === wireType);
    const wireColor = wt ? wt.color : 0xffffff;

    // Create ball mesh
    const geo = new THREE.SphereGeometry(0.008, 12, 8);
    const mat = new THREE.MeshBasicMaterial({ color: wireColor });
    const ball = new THREE.Mesh(geo, mat);

    // Add subtle point light as child
    const light = new THREE.PointLight(wireColor, 0.3, 0.15);
    ball.add(light);

    this._pivot.add(ball);

    // Set initial position
    const p0 = fiberPath.getPointAtArcLength(0);
    ball.position.set(p0.x, p0.y, p0.z);

    this._animations.set(connectionId, {
      connectionId,
      fiberPath,
      u: 0,
      speed: 0.15, // world-units per second
      ball,
      loop: true,
    });
  }

  /**
   * Stop animating on a specific connection.
   * @param {string} connectionId
   */
  stopOnConnection(connectionId) {
    const anim = this._animations.get(connectionId);
    if (!anim) return;

    this._pivot.remove(anim.ball);
    anim.ball.children.forEach(c => {
      if (c.dispose) c.dispose();
    });
    anim.ball.geometry.dispose();
    anim.ball.material.dispose();

    this._animations.delete(connectionId);
  }

  /**
   * Toggle animation on a connection — start if not running, stop if running.
   * @param {string} connectionId
   */
  toggle(connectionId) {
    if (this._animations.has(connectionId)) {
      this.stopOnConnection(connectionId);
    } else {
      this.startOnConnection(connectionId);
    }
  }

  /** Stop all active animations. */
  stopAll() {
    for (const id of [...this._animations.keys()]) {
      this.stopOnConnection(id);
    }
  }

  /**
   * Advance all animations by dt seconds.
   * Called from SceneManager's tick loop.
   * @param {number} dt — delta time in seconds
   */
  tick(dt) {
    for (const anim of this._animations.values()) {
      const len = anim.fiberPath.totalLength;
      if (len <= 0) continue;

      anim.u += (dt * anim.speed) / len;

      if (anim.u >= 1) {
        if (anim.loop) {
          anim.u = anim.u % 1;
        } else {
          anim.u = 1;
        }
      }

      const pos = anim.fiberPath.getPointAtArcLength(anim.u);
      anim.ball.position.set(pos.x, pos.y, pos.z);
    }
  }

  /** Clean up all resources. */
  dispose() {
    this.stopAll();
    this._pivot      = null;
    this._connections = null;
    this._resolveEndpoint = null;
  }
}
