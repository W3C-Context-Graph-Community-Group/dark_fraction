import * as THREE from 'three';
import { ObservatronChannelManager } from './channel-manager.js';
import { FacetHeight } from './facet-height.js';

// ============================================================
// Observatron — self-contained CGPL observatron renderer
// ============================================================

const OBS_RADIUS = 0.5;

function darkFraction(n, r) {
  if (n <= 0) return 0;
  if (r < 0)  return 1;
  if (r >= n) return 0;
  let q = Math.pow(2, -n);
  let sum = q;
  for (let k = 1; k <= r; k++) {
    q = q * (n - k + 1) / k;
    sum += q;
  }
  return Math.max(0, Math.min(1, 1 - sum));
}


function disposeGroup(g) {
  if (!g) return;
  g.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) o.material.dispose();
  });
}

export class Observatron {
  /**
   * @param {HTMLElement} containerEl — element to mount the renderer into
   *   (typically #canvas-wrap). An overlay sibling (#overlay) is expected
   *   in the DOM for HTML labels.
   */
  constructor(containerEl) {
    this._container = containerEl;

    // ── state ──
    this._channelMgr = new ObservatronChannelManager({ systemId: '0', observatronId: '0' });
    this._channelsRange = null;  // {min, max} or null
    this._eventsRange = null;    // {min, max} or null
    this._anchorsRange = null;   // {min, max} or null
    this._pathsRange = null;     // {min, max} or null
    this._seed = undefined;

    // ── scene ──
    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0x0a0a12);

    this._camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    this._camera.position.set(0, 0, 10);

    this._renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this._renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this._renderer.setSize(innerWidth, innerHeight);
    this._renderer.domElement.style.pointerEvents = 'none';
    containerEl.appendChild(this._renderer.domElement);

    // lights
    this._scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(4, 5, 8);
    this._scene.add(key);
    const rim = new THREE.DirectionalLight(0x88aaff, 0.5);
    rim.position.set(-5, -3, 4);
    this._scene.add(rim);

    // ── pivot & mesh ──
    this._pivot = new THREE.Group();
    this._pivot.position.set(0, 0, 0);
    this._scene.add(this._pivot);
    this._mesh = null;

    const BOX_SIZE = OBS_RADIUS * 3.0;

    // (2D bounding box removed — grid dots handle this role)

    // 3D wireframe cube (rotates with pivot)
    const cubeGeo = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
    const cubeEdges = new THREE.EdgesGeometry(cubeGeo);
    this._bgCube = new THREE.LineSegments(cubeEdges,
      new THREE.LineBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.5 })
    );
    this._bgCube.visible = false;
    this._pivot.add(this._bgCube);
    cubeGeo.dispose();

    // front-top-left corner marker
    const h = BOX_SIZE / 2;
    const markerGeo = new THREE.BufferGeometry();
    markerGeo.setAttribute('position', new THREE.Float32BufferAttribute([-h, h, h], 3));
    this._bgCorner = new THREE.Points(markerGeo, new THREE.PointsMaterial({
      color: 0xffffff, size: 6, sizeAttenuation: false,
    }));
    this._bgCorner.visible = false;
    this._pivot.add(this._bgCorner);

    // ── HTML labels ──
    this._overlay = document.getElementById('overlay');
    this._labelEl = null;
    this._metaEl = null;

    // ── color scheme ──
    this._colorScheme = null;

    // ── zoom ──
    this._zoomCtrl = null;

    // ── camera fit ──
    this.fitCamera();

    // ── drag ──
    this._setupDrag();

    // ── resize ──
    this._boundResize = () => {
      this._renderer.setSize(innerWidth, innerHeight);
      this.fitCamera();
      this._updateLabels();
    };
    addEventListener('resize', this._boundResize);

    // ── animation loop ──
    this._running = true;
    this._loop();
  }

  // ────────────────────────────────────────────
  // PUBLIC API
  // ────────────────────────────────────────────

  /**
   * Execute a command against this observatron.
   * @param {'seed'|'emit'|'reset'|'rotate'} command
   * @param {object} data
   */
  exec(command, data) {
    const handler = this._commands[command];
    if (!handler) throw new Error(`Observatron: unknown command "${command}"`);
    handler.call(this, data);
  }

  /** Save current render as a downloadable PNG. */
  saveImage(filename = 'observatron.png') {
    this._renderer.render(this._scene, this._camera);
    const link = document.createElement('a');
    link.download = filename;
    link.href = this._renderer.domElement.toDataURL('image/png');
    link.click();
  }

  /** Fit the orthographic camera to the single observatron. */
  fitCamera() {
    const worldW = 2.5;
    const worldH = 2.2;
    const aspect = innerWidth / innerHeight;
    let viewW, viewH;
    if (aspect > worldW / worldH) {
      viewH = worldH;
      viewW = viewH * aspect;
    } else {
      viewW = worldW;
      viewH = viewW / aspect;
    }
    const z = this._zoomCtrl ? this._zoomCtrl.value : 1;
    viewW *= z;
    viewH *= z;

    this._camera.left   = -viewW / 2;
    this._camera.right  =  viewW / 2;
    this._camera.top    =  viewH / 2;
    this._camera.bottom = -viewH / 2;
    this._camera.updateProjectionMatrix();
  }

  /** Expose zoom control setter for the app shell. */
  set zoomCtrl(ctrl) {
    this._zoomCtrl = ctrl;
  }

  /** Set a ColorScheme instance; wires onChange to rebuild. */
  set colorScheme(cs) {
    this._colorScheme = cs;
    cs.onChange = () => this._rebuild();
  }

  /** Set channel count range {min, max} and re-seed. */
  set channelsRange(range) {
    this._channelsRange = range;
    if (this._seed !== undefined) this._cmd_seed({ seed: this._seed });
  }

  /** Set event count range {min, max} and re-seed. */
  set eventsRange(range) {
    this._eventsRange = range;
    if (this._seed !== undefined) this._cmd_seed({ seed: this._seed });
  }

  /** Set anchors-per-event range {min, max} and re-seed. */
  set anchorsRange(range) {
    this._anchorsRange = range;
    if (this._seed !== undefined) this._cmd_seed({ seed: this._seed });
  }

  /** Set paths-per-anchor range {min, max} and re-seed. */
  set pathsRange(range) {
    this._pathsRange = range;
    if (this._seed !== undefined) this._cmd_seed({ seed: this._seed });
  }

  /** Stop animation, detach DOM, dispose THREE resources. */
  dispose() {
    this._running = false;
    removeEventListener('resize', this._boundResize);

    // drag listeners
    this._container.removeEventListener('mousedown', this._boundMouseDown);
    removeEventListener('mousemove', this._boundMouseMove);
    removeEventListener('mouseup', this._boundMouseUp);
    this._container.removeEventListener('touchstart', this._boundTouchStart);
    this._container.removeEventListener('touchmove', this._boundTouchMove);
    this._container.removeEventListener('touchend', this._boundTouchEnd);
    this._container.removeEventListener('touchcancel', this._boundTouchEnd);

    // labels
    if (this._labelEl) this._labelEl.remove();
    if (this._metaEl)  this._metaEl.remove();

    // THREE resources
    if (this._mesh) {
      this._pivot.remove(this._mesh.group);
      disposeGroup(this._mesh.group);
    }
    this._scene.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    this._renderer.dispose();
    this._renderer.domElement.remove();
  }

  // ────────────────────────────────────────────
  // COMMAND MAP
  // ────────────────────────────────────────────

  get _commands() {
    return {
      seed:   this._cmd_seed,
      emit:   this._cmd_emit,
      reset:  this._cmd_reset,
      rotate: this._cmd_rotate,
    };
  }

  _cmd_seed(data) {
    const seed = data.seed ?? 0;
    this._seed = seed;
    this._channelMgr.seed(seed, {
      channelsRange: data.channelsRange ?? this._channelsRange ?? null,
      eventsRange:   data.eventsRange   ?? this._eventsRange   ?? null,
      anchorsRange:  data.anchorsRange  ?? this._anchorsRange  ?? null,
      pathsRange:    data.pathsRange    ?? this._pathsRange    ?? null,
    });
    this._rebuild();
  }

  _cmd_emit(data) {
    // emit is not used with the channel manager; kept for API compatibility
    this._rebuild();
  }

  _cmd_reset() {
    this._channelMgr.reset();
    this._rebuild();
  }

  _cmd_rotate(data) {
    this._pivot.rotation.x += (data.x ?? 0);
    this._pivot.rotation.y += (data.y ?? 0);
  }

  // ────────────────────────────────────────────
  // INTERNAL — derive & build
  // ────────────────────────────────────────────

  _rebuild() {
    if (this._mesh) {
      this._pivot.remove(this._mesh.group);
      disposeGroup(this._mesh.group);
    }
    const built = this._buildMesh();
    this._pivot.add(built.group);
    this._mesh = built;
    this._updateLabels();
  }

  _deriveSpikes() {
    const spikes = [];
    const events = this._channelMgr.events;

    // build channel→index map for region assignment
    const channelIndex = new Map();
    for (const ev of events) {
      if (!channelIndex.has(ev.channel)) {
        channelIndex.set(ev.channel, channelIndex.size);
      }
    }

    // per-channel accumulators
    const channelStats = new Map(); // channelName → {m, r}
    for (const [ch] of channelIndex) channelStats.set(ch, { m: 0, r: 0 });

    for (const ev of events) {
      const regionIdx = channelIndex.get(ev.channel);
      const st = channelStats.get(ev.channel);
      for (const att of ev.attachments) {
        for (const col of att.columns) {
          const f = col.facets;
          const mBit = f['/meaning'].symbol.length   > 0 ? 1 : 0;
          const sBit = f['/structure']['constraint-key'].length > 0 ? 1 : 0;
          const cBit = f['/context'].timestamp.length > 0 ? 1 : 0;
          const v = [1, mBit, sBit, cBit];
          spikes.push({
            region: regionIdx,
            v,
            col,
            channel: ev.channel,
            eventUrl: ev.url,
            anchorUrl: att.url,
          });
          st.m += 1;
          st.r += mBit + sBit + cBit;
        }
      }
    }

    // regionStats ordered by channel index
    const regionStats = [];
    for (const [, st] of channelStats) {
      regionStats.push({ m: st.m, r: st.r, n: 3 * st.m, delta: darkFraction(3 * st.m, st.r) });
    }

    return { spikes, regionStats };
  }

  _buildMesh() {
    const group = new THREE.Group();
    const { spikes, regionStats } = this._deriveSpikes();
    const n = spikes.length;
    const cs = this._colorScheme;

    const sphereColor  = cs ? cs.sphereColor  : 0x3a3a42;
    const channelColor = cs ? cs.channelColor : 0x1a1a20;
    const emptyColor   = cs ? cs.emptyColor   : 0x2a2a30;

    if (n === 0) {
      group.add(new THREE.Mesh(
        new THREE.SphereGeometry(OBS_RADIUS, 48, 48),
        new THREE.MeshPhongMaterial({ color: emptyColor, shininess: 40 })
      ));
      return { group, n: 0, regionStats };
    }

    // ── channel centroids: deterministic placement ──
    const numChannels = regionStats.length;
    const channelCentroids = [];
    if (numChannels === 1) {
      channelCentroids.push(new THREE.Vector3(0, 1, 0));
    } else {
      const ga = Math.PI * (3 - Math.sqrt(5));
      for (let ci = 0; ci < numChannels; ci++) {
        const cy = 1 - (ci / (numChannels - 1)) * 2;
        const cr = Math.sqrt(Math.max(0, 1 - cy * cy));
        const ct = ci * ga;
        channelCentroids.push(new THREE.Vector3(Math.cos(ct) * cr, cy, Math.sin(ct) * cr));
      }
    }

    // ── count spikes per channel ──
    const spikesPerChannel = new Array(numChannels).fill(0);
    for (const sp of spikes) spikesPerChannel[sp.region]++;

    // ── compute channel cap angles from spike count + footprint ──
    const spikeFootprint = Math.asin(Math.min(1, FacetHeight.baseEdge(n, OBS_RADIUS) / (Math.sqrt(3) * OBS_RADIUS)));
    const channels = [];
    for (let ci = 0; ci < numChannels; ci++) {
      const K = spikesPerChannel[ci];
      const rawAngle = spikeFootprint * Math.sqrt(K) + Math.PI / 26;
      const capAngle = Math.max(Math.PI / 18, Math.min(Math.PI / 3, rawAngle));
      channels.push({ centroid: channelCentroids[ci], angle: capAngle });
    }

    // ── spike directions: Fibonacci within each channel's cone ──
    const dirs = new Array(n);
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const channelSpikeIndices = Array.from({ length: numChannels }, () => []);
    for (let si = 0; si < n; si++) channelSpikeIndices[spikes[si].region].push(si);

    for (let ci = 0; ci < numChannels; ci++) {
      const ch = channels[ci];
      const indices = channelSpikeIndices[ci];
      const K = indices.length;
      const spreadAngle = ch.angle * 0.7;

      const q = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0), ch.centroid
      );

      for (let j = 0; j < K; j++) {
        const t = K === 1 ? 0 : j / (K - 1);
        const ly = 1 - t * (1 - Math.cos(spreadAngle));
        const lr = Math.sqrt(Math.max(0, 1 - ly * ly));
        const phi = j * goldenAngle;
        const localDir = new THREE.Vector3(Math.cos(phi) * lr, ly, Math.sin(phi) * lr);
        localDir.applyQuaternion(q).normalize();
        dirs[indices[j]] = localDir;
      }
    }

    // ── sphere (uniform color) ──
    const sphereGeo = new THREE.SphereGeometry(OBS_RADIUS * 0.999, 64, 64);
    group.add(new THREE.Mesh(sphereGeo, new THREE.MeshPhongMaterial({
      color: sphereColor, shininess: 40
    })));

    // ── channel caps (spherical caps with radial alpha falloff) ──
    for (let ci = 0; ci < numChannels; ci++) {
      const ch = channels[ci];
      const capR = OBS_RADIUS * 1.001;
      const capGeo = new THREE.SphereGeometry(capR, 48, 24, 0, Math.PI * 2, 0, ch.angle);

      // per-vertex alpha: 1.0 in inner 90%, fading to 0 at the edge
      const capPos = capGeo.attributes.position;
      const alphas = new Float32Array(capPos.count);
      const fadeStart = ch.angle * 0.9;
      for (let vi = 0; vi < capPos.count; vi++) {
        const y = capPos.getY(vi);
        const theta = Math.acos(Math.min(1, Math.max(-1, y / capR)));
        alphas[vi] = theta <= fadeStart
          ? 1.0
          : Math.max(0, 1.0 - (theta - fadeStart) / (ch.angle - fadeStart));
      }
      capGeo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

      const capMat = new THREE.ShaderMaterial({
        uniforms: { color: { value: new THREE.Color(channelColor) } },
        vertexShader: [
          'attribute float alpha;',
          'varying float vAlpha;',
          'void main() {',
          '  vAlpha = alpha;',
          '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
          '}',
        ].join('\n'),
        fragmentShader: [
          'uniform vec3 color;',
          'varying float vAlpha;',
          'void main() {',
          '  gl_FragColor = vec4(color, vAlpha);',
          '}',
        ].join('\n'),
        transparent: true,
        depthWrite: false,
      });

      const capMesh = new THREE.Mesh(capGeo, capMat);
      capMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), ch.centroid);
      group.add(capMesh);
    }

    // ── spikes: one tetrahedron per column ──
    const baseEdge = FacetHeight.baseEdge(n, OBS_RADIUS);
    const rBase = baseEdge / Math.sqrt(3);
    const baseHeightRef = baseEdge * Math.sqrt(2 / 3);

    const tmpRef = new THREE.Vector3();
    const u = new THREE.Vector3();
    const v3 = new THREE.Vector3();

    for (let i = 0; i < n; i++) {
      const normal = dirs[i];
      const sp = spikes[i];
      const hTetra = FacetHeight.spikeHeight(baseHeightRef, sp.v, OBS_RADIUS);

      const verifiedFrac = FacetHeight.verifiedFraction(sp.v);
      const spikeCol = cs
        ? cs.spikeColor(verifiedFrac)
        : new THREE.Color(0.25 + verifiedFrac * 0.75, 0.45 + verifiedFrac * 0.55, 0.5 + verifiedFrac * 0.5);

      const basePt = normal.clone().multiplyScalar(OBS_RADIUS * 1.003);
      const apex   = normal.clone().multiplyScalar(OBS_RADIUS + hTetra);

      tmpRef.set(0, 1, 0);
      if (Math.abs(normal.y) > 0.98) tmpRef.set(1, 0, 0);
      u.crossVectors(normal, tmpRef).normalize();
      v3.crossVectors(normal, u).normalize();

      const bv = [];
      for (let k = 0; k < 3; k++) {
        const phi = (2 * Math.PI * k) / 3;
        bv.push(
          basePt.clone()
            .addScaledVector(u, rBase * Math.cos(phi))
            .addScaledVector(v3, rBase * Math.sin(phi))
        );
      }

      // tetrahedron base (channel hole color)
      const baseGeom = new THREE.BufferGeometry();
      baseGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
        bv[0].x, bv[0].y, bv[0].z,
        bv[2].x, bv[2].y, bv[2].z,
        bv[1].x, bv[1].y, bv[1].z,
      ]), 3));
      baseGeom.computeVertexNormals();
      group.add(new THREE.Mesh(baseGeom, new THREE.MeshPhongMaterial({
        color: channelColor, shininess: 10, flatShading: true
      })));

      // three side faces (spike color based on verification)
      const sideGeom = new THREE.BufferGeometry();
      sideGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
        bv[0].x, bv[0].y, bv[0].z,  bv[1].x, bv[1].y, bv[1].z,  apex.x, apex.y, apex.z,
        bv[1].x, bv[1].y, bv[1].z,  bv[2].x, bv[2].y, bv[2].z,  apex.x, apex.y, apex.z,
        bv[2].x, bv[2].y, bv[2].z,  bv[0].x, bv[0].y, bv[0].z,  apex.x, apex.y, apex.z,
      ]), 3));
      sideGeom.computeVertexNormals();
      group.add(new THREE.Mesh(sideGeom, new THREE.MeshPhongMaterial({
        color: spikeCol, shininess: 60, flatShading: true
      })));
    }

    return { group, n, regionStats };
  }

  // ────────────────────────────────────────────
  // INTERNAL — labels
  // ────────────────────────────────────────────

  _projectToScreen(v3) {
    const p = v3.clone().project(this._camera);
    return {
      x: (p.x * 0.5 + 0.5) * innerWidth,
      y: (1 - (p.y * 0.5 + 0.5)) * innerHeight,
    };
  }

  _updateLabels() {
    if (!this._labelEl && !this._metaEl) return;

    const topEdge = this._projectToScreen(new THREE.Vector3(0, 0.75, 0));
    const botEdge = this._projectToScreen(new THREE.Vector3(0, -0.75, 0));

    if (this._labelEl) {
      this._labelEl.style.left  = `${topEdge.x - 90}px`;
      this._labelEl.style.top   = `${topEdge.y - 22}px`;
      this._labelEl.style.width = '180px';
      this._labelEl.style.textAlign = 'center';
    }

    if (this._metaEl) {
      const ch = this._channelMgr.channelCount;
      const ev = this._channelMgr.eventCount;
      const paths = this._channelMgr.columnCount;
      let totalDelta = 0, totM = 0;
      if (this._mesh) {
        for (const s of this._mesh.regionStats) {
          totalDelta += s.delta * s.m;
          totM += s.m;
        }
      }
      const avgDelta = totM > 0 ? totalDelta / totM : 0;

      this._metaEl.textContent = `${ch} ch · ${ev} ev · ${paths} pa · δ̄ ${avgDelta.toFixed(3)}`;
      this._metaEl.style.left  = `${botEdge.x - 110}px`;
      this._metaEl.style.top   = `${botEdge.y + 4}px`;
      this._metaEl.style.width = '220px';
      this._metaEl.style.textAlign = 'center';
    }
  }

  // ────────────────────────────────────────────
  // INTERNAL — drag rotation
  // ────────────────────────────────────────────

  _setupDrag() {
    this._dragActive = false;
    this._lastPointer = { x: 0, y: 0 };
    const raycaster = new THREE.Raycaster();
    const pointerNDC = new THREE.Vector2();

    const setNDC = (cx, cy) => {
      pointerNDC.x = (cx / innerWidth) * 2 - 1;
      pointerNDC.y = -(cy / innerHeight) * 2 + 1;
    };

    const pick = (cx, cy) => {
      setNDC(cx, cy);
      raycaster.setFromCamera(pointerNDC, this._camera);
      return raycaster.intersectObject(this._pivot, true).length > 0;
    };

    const onDown = (cx, cy) => {
      if (pick(cx, cy)) {
        this._dragActive = true;
        this._lastPointer.x = cx;
        this._lastPointer.y = cy;
      }
    };

    const onMove = (cx, cy) => {
      if (!this._dragActive) return;
      const dx = cx - this._lastPointer.x;
      const dy = cy - this._lastPointer.y;
      this._lastPointer.x = cx;
      this._lastPointer.y = cy;
      const speed = 0.008;
      this._pivot.rotation.y += dx * speed;
      this._pivot.rotation.x += dy * speed;
    };

    const onUp = () => { this._dragActive = false; };

    // mouse
    this._boundMouseDown = (e) => { if (e.button === 0) onDown(e.clientX, e.clientY); };
    this._boundMouseMove = (e) => onMove(e.clientX, e.clientY);
    this._boundMouseUp   = onUp;
    this._container.addEventListener('mousedown', this._boundMouseDown);
    addEventListener('mousemove', this._boundMouseMove);
    addEventListener('mouseup', this._boundMouseUp);

    // touch
    this._boundTouchStart = (e) => {
      if (e.touches.length === 1) onDown(e.touches[0].clientX, e.touches[0].clientY);
    };
    this._boundTouchMove = (e) => {
      if (e.touches.length === 1) {
        onMove(e.touches[0].clientX, e.touches[0].clientY);
        e.preventDefault();
      }
    };
    this._boundTouchEnd = onUp;
    this._container.addEventListener('touchstart', this._boundTouchStart, { passive: true });
    this._container.addEventListener('touchmove', this._boundTouchMove, { passive: false });
    this._container.addEventListener('touchend', this._boundTouchEnd);
    this._container.addEventListener('touchcancel', this._boundTouchEnd);
  }

  // ────────────────────────────────────────────
  // INTERNAL — animation loop
  // ────────────────────────────────────────────

  _loop() {
    if (!this._running) return;
    requestAnimationFrame(() => this._loop());
    this._renderer.render(this._scene, this._camera);
  }
}
