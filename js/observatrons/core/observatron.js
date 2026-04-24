import * as THREE from 'three';

// ============================================================
// Observatron — self-contained CGPL observatron renderer
// ============================================================

const OBS_RADIUS = 0.5;

function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randIntIn(rand, lo, hi) {
  return lo + Math.floor(rand() * (hi - lo + 1));
}

function makeColumn(rand, obsId, msgId, datasetPath, colName) {
  const base = `cgp://${obsId}/events/${msgId}/${datasetPath}#${colName}`;
  const hasMeaning   = rand() < 0.5;
  const hasStructure = rand() < 0.5;
  return {
    name: colName,
    facets: {
      data:      { url: base },
      meaning:   { url: hasMeaning   ? base + "/foo" : null },
      structure: { url: hasStructure ? base + "/bar" : null },
      context:   { url: null },
    },
  };
}

function makeMessageEvent(rand, obsId, msgIndex) {
  const msgId = `msg-${String(msgIndex + 1).padStart(3, '0')}`;
  const numCsvs = randIntIn(rand, 1, 3);
  const attachments = [];
  for (let i = 0; i < numCsvs; i++) {
    const datasetPath = `dataset-${i + 1}.csv`;
    const numCols = randIntIn(rand, 1, 5);
    const columns = [];
    for (let k = 0; k < numCols; k++) {
      columns.push(makeColumn(rand, obsId, msgId, datasetPath, `col-${k + 1}`));
    }
    attachments.push({ path: datasetPath, columns });
  }
  return {
    "message-id": msgId,
    timestamp: new Date().toISOString(),
    attachments,
  };
}

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

function colorFromDelta(delta) {
  const d = Math.max(0, Math.min(1, delta));
  return new THREE.Color(d, 0, 1 - d);
}

function vecMag(v) {
  let s = 0; for (const x of v) s += x * x; return Math.sqrt(s);
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
    this._state = { "message-events": [] };

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

    // 2D background square (fixed in scene)
    const squareGeo = new THREE.PlaneGeometry(BOX_SIZE, BOX_SIZE);
    const squareMat = new THREE.MeshBasicMaterial({
      color: 0x9b87ff, transparent: true, opacity: 0.04, side: THREE.DoubleSide,
    });
    const square = new THREE.Mesh(squareGeo, squareMat);
    square.position.set(0, 0, -0.5);
    this._scene.add(square);

    // 2D square border outline (fixed in scene)
    const squareEdges = new THREE.EdgesGeometry(squareGeo);
    const squareLine = new THREE.LineSegments(squareEdges,
      new THREE.LineBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.6 })
    );
    squareLine.position.copy(square.position);
    this._scene.add(squareLine);

    // 3D wireframe cube (rotates with pivot)
    const cubeGeo = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
    const cubeEdges = new THREE.EdgesGeometry(cubeGeo);
    const cubeLine = new THREE.LineSegments(cubeEdges,
      new THREE.LineBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.5 })
    );
    this._pivot.add(cubeLine);
    cubeGeo.dispose();

    // ── HTML labels ──
    this._overlay = document.getElementById('overlay');
    this._labelEl = document.createElement('div');
    this._labelEl.className = 'obs-label';
    this._labelEl.textContent = 'observatron';
    this._overlay.appendChild(this._labelEl);

    this._metaEl = document.createElement('div');
    this._metaEl.className = 'obs-meta';
    this._overlay.appendChild(this._metaEl);

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
    this._state["message-events"] = [];
    const rand = prng(seed);
    const numMsgs = randIntIn(rand, 1, 3);
    for (let i = 0; i < numMsgs; i++) {
      const idx = this._state["message-events"].length;
      this._state["message-events"].push(makeMessageEvent(rand, 'observatron', idx));
    }
    this._rebuild();
  }

  _cmd_emit(data) {
    const events = data.events ?? [];
    for (const ev of events) {
      this._state["message-events"].push(ev);
    }
    this._rebuild();
  }

  _cmd_reset() {
    this._state["message-events"] = [];
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
    const regionStats = [];

    this._state["message-events"].forEach((ev, regionIdx) => {
      let m = 0, r = 0;
      ev.attachments.forEach(att => {
        att.columns.forEach(col => {
          const f = col.facets;
          const mBit = f.meaning.url   ? 1 : 0;
          const sBit = f.structure.url ? 1 : 0;
          const cBit = f.context.url   ? 1 : 0;
          const v = [1, mBit, sBit, cBit];
          spikes.push({
            region: regionIdx,
            v,
            col,
            messageId: ev["message-id"],
            datasetPath: att.path,
          });
          m += 1;
          r += mBit + sBit + cBit;
        });
      });
      regionStats.push({ m, r, n: 3 * m, delta: darkFraction(3 * m, r) });
    });

    return { spikes, regionStats };
  }

  _buildMesh() {
    const group = new THREE.Group();
    const { spikes, regionStats } = this._deriveSpikes();
    const n = spikes.length;

    const emptyColor = this._colorScheme ? this._colorScheme.emptyColor : 0x202035;

    if (n === 0) {
      group.add(new THREE.Mesh(
        new THREE.SphereGeometry(OBS_RADIUS, 48, 48),
        new THREE.MeshPhongMaterial({ color: emptyColor, shininess: 20 })
      ));
      return { group, n: 0, regionStats };
    }

    // spike directions via Fibonacci distribution
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const dirs = [];
    for (let i = 0; i < n; i++) {
      const y = n === 1 ? 0 : 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = i * goldenAngle;
      dirs.push(new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r));
    }

    // region-colored sphere (Voronoi partition by nearest spike)
    const cs = this._colorScheme;
    const paletteDelta = regionStats.map(s =>
      cs ? cs.regionColor(s.delta) : colorFromDelta(s.delta)
    );
    const sphereGeo = new THREE.SphereGeometry(OBS_RADIUS * 0.99, 60, 60);
    const pos = sphereGeo.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i), vy = pos.getY(i), vz = pos.getZ(i);
      const L = Math.sqrt(vx * vx + vy * vy + vz * vz);
      const nx = vx / L, ny = vy / L, nz = vz / L;
      let bestDot = -Infinity, bestRegion = 0;
      for (let s = 0; s < n; s++) {
        const d = nx * dirs[s].x + ny * dirs[s].y + nz * dirs[s].z;
        if (d > bestDot) { bestDot = d; bestRegion = spikes[s].region; }
      }
      const c = paletteDelta[bestRegion] || new THREE.Color(emptyColor);
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    }
    sphereGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    group.add(new THREE.Mesh(sphereGeo, new THREE.MeshPhongMaterial({
      vertexColors: true, shininess: 20
    })));

    // spikes: one tetrahedron per column
    const baseEdge = 2.8 * OBS_RADIUS / Math.sqrt(n);
    const rBase = baseEdge / Math.sqrt(3);
    const baseHeightRef = baseEdge * Math.sqrt(2 / 3);

    const tmpRef = new THREE.Vector3();
    const u = new THREE.Vector3();
    const v3 = new THREE.Vector3();

    for (let i = 0; i < n; i++) {
      const normal = dirs[i];
      const sp = spikes[i];
      const mag = vecMag(sp.v);
      const hTetra = baseHeightRef * mag * 1.15;

      const verifiedFrac = (mag * mag - 1) / 3;
      const spikeColor = cs
        ? cs.spikeColor(verifiedFrac)
        : new THREE.Color(1 - verifiedFrac, 0.05, verifiedFrac);
      const regionColor = paletteDelta[sp.region] || new THREE.Color(emptyColor);

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

      // tetrahedron base (region color)
      const baseGeom = new THREE.BufferGeometry();
      baseGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
        bv[0].x, bv[0].y, bv[0].z,
        bv[2].x, bv[2].y, bv[2].z,
        bv[1].x, bv[1].y, bv[1].z,
      ]), 3));
      baseGeom.computeVertexNormals();
      group.add(new THREE.Mesh(baseGeom, new THREE.MeshPhongMaterial({
        color: regionColor, shininess: 25, flatShading: true
      })));

      // three side faces (spike color)
      const sideGeom = new THREE.BufferGeometry();
      sideGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
        bv[0].x, bv[0].y, bv[0].z,  bv[1].x, bv[1].y, bv[1].z,  apex.x, apex.y, apex.z,
        bv[1].x, bv[1].y, bv[1].z,  bv[2].x, bv[2].y, bv[2].z,  apex.x, apex.y, apex.z,
        bv[2].x, bv[2].y, bv[2].z,  bv[0].x, bv[0].y, bv[0].z,  apex.x, apex.y, apex.z,
      ]), 3));
      sideGeom.computeVertexNormals();
      group.add(new THREE.Mesh(sideGeom, new THREE.MeshPhongMaterial({
        color: spikeColor, shininess: 60, flatShading: true
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
    const topEdge = this._projectToScreen(new THREE.Vector3(0, 0.75, 0));
    const botEdge = this._projectToScreen(new THREE.Vector3(0, -0.75, 0));

    this._labelEl.style.left  = `${topEdge.x - 90}px`;
    this._labelEl.style.top   = `${topEdge.y - 22}px`;
    this._labelEl.style.width = '180px';
    this._labelEl.style.textAlign = 'center';

    const events = this._state["message-events"].length;
    let cols = 0;
    for (const ev of this._state["message-events"]) {
      for (const a of ev.attachments) cols += a.columns.length;
    }
    let totalDelta = 0, totM = 0;
    if (this._mesh) {
      for (const s of this._mesh.regionStats) {
        totalDelta += s.delta * s.m;
        totM += s.m;
      }
    }
    const avgDelta = totM > 0 ? totalDelta / totM : 0;

    this._metaEl.textContent = `${events} events · ${cols} columns · δ̄ ${avgDelta.toFixed(3)}`;
    this._metaEl.style.left  = `${botEdge.x - 110}px`;
    this._metaEl.style.top   = `${botEdge.y + 4}px`;
    this._metaEl.style.width = '220px';
    this._metaEl.style.textAlign = 'center';
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
