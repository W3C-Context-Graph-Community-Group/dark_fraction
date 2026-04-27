import * as THREE from 'three';
import { FiberPathSolver } from './FiberPathSolver.js';

/**
 * Drives glowing balls of light from source ring to target ring
 * along all five fiber paths resolved by FiberPathSolver.
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
    this._animations      = new Map(); // connectionId → { balls: [...] }
  }

  /**
   * Start animating light balls along all 5 fibers of a connection.
   * @param {string} connectionId
   * @param {number} [duration=0.5] — seconds for the ball to travel source→target
   */
  startOnConnection(connectionId, duration = 0.5) {
    if (this._animations.has(connectionId)) return;

    const conn = this._connections.get(connectionId);
    if (!conn) return;

    const infoA = this._resolveEndpoint(conn.source.nodeId, conn.source.spikeIndex);
    const infoB = this._resolveEndpoint(conn.target.nodeId, conn.target.spikeIndex);
    if (!infoA || !infoB) return;

    const radiusA = conn.rings[0] ? conn.rings[0]._radius : 0.03;
    const radiusB = conn.rings.length > 1 ? conn.rings[conn.rings.length - 1]._radius : 0.03;

    const source = { position: infoA.apex, normal: infoA.direction, radius: radiusA };
    const target = { position: infoB.apex, normal: infoB.direction, radius: radiusB };

    const fiberPaths = FiberPathSolver.resolveBridge(source, target);
    if (!fiberPaths || fiberPaths.length === 0) return;

    const balls = [];

    for (const fiberPath of fiberPaths) {
      const wireColor = fiberPath.color;

      const geo = new THREE.SphereGeometry(0.014, 16, 10);
      const mat = new THREE.MeshBasicMaterial({ color: wireColor, toneMapped: false });
      const ball = new THREE.Mesh(geo, mat);

      const light = new THREE.PointLight(wireColor, 0.8, 0.25);
      ball.add(light);

      this._pivot.add(ball);

      const p0 = fiberPath.getPointAtArcLength(0);
      ball.position.set(p0.x, p0.y, p0.z);

      balls.push({ fiberPath, ball, u: 0 });
    }

    this._animations.set(connectionId, {
      connectionId,
      balls,
      duration: Math.max(0.01, duration),
    });
  }

  /**
   * Stop animating on a specific connection.
   * @param {string} connectionId
   */
  stopOnConnection(connectionId) {
    const anim = this._animations.get(connectionId);
    if (!anim) return;

    for (const entry of anim.balls) {
      this._pivot.remove(entry.ball);
      entry.ball.children.forEach(c => { if (c.dispose) c.dispose(); });
      entry.ball.geometry.dispose();
      entry.ball.material.dispose();
    }

    this._animations.delete(connectionId);
  }

  /**
   * Toggle animation on a connection — start if not running, stop if running.
   * @param {string} connectionId
   * @param {number} [duration=0.5]
   */
  toggle(connectionId, duration = 0.5) {
    if (this._animations.has(connectionId)) {
      this.stopOnConnection(connectionId);
    } else {
      this.startOnConnection(connectionId, duration);
    }
  }

  /**
   * Rebuild fiber paths for running animations that involve a given node.
   * Preserves current progress (u) so balls continue at the same fraction.
   * @param {number} nodeId
   */
  refreshAnimationsForNode(nodeId) {
    for (const [id, anim] of this._animations) {
      const conn = this._connections.get(id);
      if (!conn) continue;
      if (conn.source.nodeId !== nodeId && conn.target.nodeId !== nodeId) continue;

      const infoA = this._resolveEndpoint(conn.source.nodeId, conn.source.spikeIndex);
      const infoB = this._resolveEndpoint(conn.target.nodeId, conn.target.spikeIndex);
      if (!infoA || !infoB) continue;

      const radiusA = conn.rings[0] ? conn.rings[0]._radius : 0.03;
      const radiusB = conn.rings.length > 1 ? conn.rings[conn.rings.length - 1]._radius : 0.03;

      const source = { position: infoA.apex, normal: infoA.direction, radius: radiusA };
      const target = { position: infoB.apex, normal: infoB.direction, radius: radiusB };

      const fiberPaths = FiberPathSolver.resolveBridge(source, target);
      if (!fiberPaths || fiberPaths.length === 0) continue;

      for (let i = 0; i < anim.balls.length && i < fiberPaths.length; i++) {
        anim.balls[i].fiberPath = fiberPaths[i];
        const pos = fiberPaths[i].getPointAtArcLength(anim.balls[i].u);
        anim.balls[i].ball.position.set(pos.x, pos.y, pos.z);
      }
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
    const finished = [];

    for (const [id, anim] of this._animations) {
      let allDone = true;

      for (const entry of anim.balls) {
        if (entry.u >= 1) continue;

        entry.u += dt / anim.duration;

        if (entry.u >= 1) {
          entry.u = 1;
        } else {
          allDone = false;
        }

        const pos = entry.fiberPath.getPointAtArcLength(entry.u);
        entry.ball.position.set(pos.x, pos.y, pos.z);
      }

      if (allDone) finished.push(id);
    }

    // Auto-remove completed animations
    for (const id of finished) {
      this.stopOnConnection(id);
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
