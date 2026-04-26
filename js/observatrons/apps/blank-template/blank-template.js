import * as THREE              from 'three';
import { Observatron }         from '../../core/observatron.js';
import { ColorScheme }         from './color-scheme.js';
import { ControlPanel }        from './controls/control-panel.js';
import { ZoomControl }         from './controls/zoom/zoom-control.js';
import { SaveImageControl }    from './controls/save-image/save-image-control.js';
import { LegendControl }       from './controls/legend/legend-control.js';
import { ColorSchemeControl }  from './controls/color-scheme/color-scheme-control.js';
import { GridControl }         from './controls/grid/grid-control.js';
import { RangeControl }         from './controls/range/range-control.js';
import { RotationControl }     from './controls/rotation/rotation-control.js';
import { FilterGroupControl }  from './controls/filter-group/filter-group-control.js';
import { DocsControl }         from './controls/docs/docs-control.js';

const scheme = new ColorScheme('default');
const obs = new Observatron(document.getElementById('canvas-wrap'));
obs.colorScheme = scheme;
obs.exec('seed', { seed: 0xC6A107 });

const panel = new ControlPanel();
panel.register(new LegendControl());
panel.register(new SaveImageControl({
  onSave: () => obs.saveImage('observatron.png'),
}));
panel.register(new DocsControl());

const zoomCtrl = new ZoomControl({
  onZoom: () => { obs.fitCamera(); obs._updateLabels(); },
  initial: 2,
});
obs.zoomCtrl = zoomCtrl;
obs.fitCamera();
panel.register(zoomCtrl);

const rotCtrl = new RotationControl({
  onRotate: (axis, radians) => obs.setRotation(axis, radians),
});
obs.onRotationChange = (x, y, z) => rotCtrl.update(x, y, z);
panel.register(rotCtrl);

panel.register(new FilterGroupControl({
  controls: [
    new RangeControl({
      label: 'Channels',
      onChange: (range) => { obs.channelsRange = range; },
      min: 1, max: 6, initialMin: 1, initialMax: 1,
    }),
    new RangeControl({
      label: 'Events',
      onChange: (range) => { obs.eventsRange = range; },
      min: 1, max: 10, initialMin: 1, initialMax: 3,
    }),
    new RangeControl({
      label: 'Anchors',
      onChange: (range) => { obs.anchorsRange = range; },
      min: 1, max: 5, initialMin: 1, initialMax: 1,
    }),
    new RangeControl({
      label: 'Paths',
      onChange: (range) => { obs.pathsRange = range; },
      min: 1, max: 20, initialMin: 1, initialMax: 5,
    }),
    new RangeControl({
      label: 'Visible Ch.',
      onChange: (range) => { obs.visibleChannels = range; },
      min: 0, max: 5, initialMin: 0, initialMax: 0,
    }),
  ],
}));

panel.register(new ColorSchemeControl({
  schemes: ColorScheme.presets,
  initial: 'default',
  onScheme: (name) => scheme.set(name),
}));

/* ── Grid dots ── */
let gridBack = null;   // blue dots behind the 2D box
let gridFront = null;  // white dots inside the 2D box, in front of it
let gridRAF = null;

function isAligned() {
  const r = obs._pivot.rotation;
  const eps = 0.05;
  const xMod = ((r.x % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const yMod = ((r.y % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  return (xMod < eps || xMod > Math.PI * 2 - eps) &&
         (yMod < eps || yMod > Math.PI * 2 - eps);
}

function gridTick() {
  if (!gridFront) return;
  gridFront.visible = isAligned();
  gridRAF = requestAnimationFrame(gridTick);
}

function makePoints(verts, color, opacity) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  const mat = new THREE.PointsMaterial({
    color,
    size: 3,
    sizeAttenuation: false,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  return new THREE.Points(geo, mat);
}

function buildGridLayers() {
  const spacing = 0.1;
  const extent = 1.5;                       // half-size of the full dot field
  const half = 0.75;                        // BOX_SIZE / 2

  const backVerts = [];
  const frontVerts = [];

  for (let x = -extent; x <= extent; x += spacing) {
    for (let y = -extent; y <= extent; y += spacing) {
      backVerts.push(x, y, -0.55);          // behind the 2D box
      // white dots only inside the bounding box
      if (x > -half && x < half && y > -half && y < half) {
        frontVerts.push(x, y, -0.45);       // in front of 2D box, behind observatron
      }
    }
  }

  return {
    back:  makePoints(backVerts,  0x4a90d9, 0.35),
    front: makePoints(frontVerts, 0xffffff, 0.35),
  };
}

function disposePoints(pts) {
  if (!pts) return;
  obs._scene.remove(pts);
  pts.geometry.dispose();
  pts.material.dispose();
}

/* ── Corner-dot click → animate rotation reset ── */
let gridActive = false;
let resetAnim = null;

const cornerWorld = new THREE.Vector3();
const wrap = document.getElementById('canvas-wrap');

function projectCorner(cx, cy) {
  // get the corner's world position
  const h = 0.75; // BOX_SIZE / 2
  cornerWorld.set(-h, h, h);
  obs._bgCorner.localToWorld(cornerWorld);
  const screen = obs._projectToScreen(cornerWorld);
  const dx = cx - screen.x;
  const dy = cy - screen.y;
  return Math.sqrt(dx * dx + dy * dy);
}

let downX = 0, downY = 0;
wrap.addEventListener('mousedown', (e) => { downX = e.clientX; downY = e.clientY; });
wrap.addEventListener('mouseup', (e) => {
  if (!gridActive || !obs._bgCorner.visible) return;
  // only treat as click if mouse barely moved
  if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 6) return;
  if (projectCorner(e.clientX, e.clientY) < 20) animateReset();
});

function animateReset() {
  if (resetAnim) cancelAnimationFrame(resetAnim);
  const r = obs._pivot.rotation;
  // normalise to nearest multiple of 2π so we take the short path to 0
  r.x = ((r.x % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
  r.y = ((r.y % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
  r.z = ((r.z % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
  function step() {
    r.x *= 0.85;
    r.y *= 0.85;
    r.z *= 0.85;
    rotCtrl.update(r.x, r.y, r.z);
    if (Math.abs(r.x) < 0.001 && Math.abs(r.y) < 0.001 && Math.abs(r.z) < 0.001) {
      r.x = 0; r.y = 0; r.z = 0;
      rotCtrl.update(0, 0, 0);
      resetAnim = null;
      return;
    }
    resetAnim = requestAnimationFrame(step);
  }
  step();
}

panel.register(new GridControl({
  onToggle: (active) => {
    gridActive = active;
    obs._bgCube.visible = active;
    obs._bgCorner.visible = active;
    if (active) {
      const layers = buildGridLayers();
      gridBack = layers.back;
      gridFront = layers.front;
      obs._scene.add(gridBack);
      obs._scene.add(gridFront);
      gridTick();
    } else {
      if (gridRAF) { cancelAnimationFrame(gridRAF); gridRAF = null; }
      disposePoints(gridBack);
      disposePoints(gridFront);
      gridBack = null;
      gridFront = null;
    }
  },
}));
