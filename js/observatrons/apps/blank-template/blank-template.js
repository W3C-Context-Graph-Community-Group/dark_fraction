import * as THREE              from 'three';
import { Observatron }         from '../../core/observatron.js';
import { ColorScheme }         from './color-scheme.js';
import { ControlPanel }        from './controls/control-panel.js';
import { ZoomControl }         from './controls/zoom/zoom-control.js';
import { PanControl }          from './controls/pan/pan-control.js';
import { SaveImageControl }    from './controls/save-image/save-image-control.js';
import { ColorSchemeControl }  from './controls/color-scheme/color-scheme-control.js';
import { GridControl }         from './controls/grid/grid-control.js';
import { RangeControl }         from './controls/range/range-control.js';
import { RotationControl }     from './controls/rotation/rotation-control.js';
import { CollapsibleCard }     from './controls/collapsible-card.js';
import { ResetControl }        from './controls/reset/reset-control.js';
import { CardToggleControl }   from './controls/card-toggle/card-toggle-control.js';
import { FiberBundleControl }  from './controls/fiber-bundle/fiber-bundle-control.js';
import { StyleControl }        from './controls/style/style-control.js';
import { FiberBundleManager } from '../../core/helpers/fiber_bundle/FiberBundleManager.js';

const scheme = new ColorScheme('default');
const obs = new Observatron(document.getElementById('canvas-wrap'));
obs.colorScheme = scheme;
obs.exec('seed', { seed: 0xC6A107 });

const panel = new ControlPanel();

/* ── Tools card ── */
const toolsCard = new CollapsibleCard({ label: 'Tools', id: 'tools', layout: 'row' });
toolsCard.addControl('download', new SaveImageControl({
  onSave: () => obs.saveImage('observatron.png'),
}));

/* ── Grid dots ── */
let gridBack = null;
let gridFront = null;
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
  const extent = 1.5;
  const half = 0.75;

  const backVerts = [];
  const frontVerts = [];

  for (let x = -extent; x <= extent; x += spacing) {
    for (let y = -extent; y <= extent; y += spacing) {
      backVerts.push(x, y, -0.55);
      if (x > -half && x < half && y > -half && y < half) {
        frontVerts.push(x, y, -0.45);
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

let gridActive = false;

toolsCard.addControl('grid', new GridControl({
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

toolsCard.addControl('reset', new ResetControl({
  onReset: () => { zoomCtrl.reset(); panCtrl.reset(); rotCtrl.reset(); },
}));

/* ── Card toggle buttons (all start hidden) ── */
const ico16 = 'width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';

toolsCard.addControl('toggle-view', new CardToggleControl({
  label: 'View',
  icon: `<svg ${ico16}><ellipse cx="8" cy="8" rx="6" ry="3.5"/><circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none"/></svg>`,
  initial: false,
  onToggle: (active) => { viewSection.style.display = active ? '' : 'none'; },
}));
toolsCard.addControl('toggle-rot', new CardToggleControl({
  label: 'Rot',
  icon: `<svg ${ico16}><path d="M2 8a6 6 0 0110.5-4"/><polyline points="12 1 13 4 10 5"/><path d="M14 8a6 6 0 01-10.5 4"/><polyline points="4 15 3 12 6 11"/></svg>`,
  initial: false,
  onToggle: (active) => { rotSection.style.display = active ? '' : 'none'; },
}));
toolsCard.addControl('toggle-filters', new CardToggleControl({
  label: 'Filters',
  icon: `<svg ${ico16}><path d="M2 3h12l-4.5 5v4l-3 1.5V8z"/></svg>`,
  initial: false,
  onToggle: (active) => { filtersSection.style.display = active ? '' : 'none'; },
}));
toolsCard.addControl('toggle-color', new CardToggleControl({
  label: 'Color',
  icon: `<svg ${ico16}><path d="M8 1.5a5.5 5.5 0 00-1 10.9c1 .2 1-.5 1-.9v-.3c0-.6-.4-.8-.8-1-.5-.2-1.1-.4-1.1-1.4A4 4 0 018 3.5a4 4 0 012.9 5.3c0 1-.6 1.2-1.1 1.4-.4.2-.8.4-.8 1v.3c0 .4 0 1.1 1 .9A5.5 5.5 0 008 1.5z"/><circle cx="6" cy="6.5" r="1" fill="currentColor" stroke="none"/><circle cx="8" cy="5" r="1" fill="currentColor" stroke="none"/><circle cx="10" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>`,
  initial: false,
  onToggle: (active) => { colorSection.style.display = active ? '' : 'none'; },
}));
toolsCard.addControl('toggle-fiber', new CardToggleControl({
  label: 'Fiber',
  icon: `<svg ${ico16}><circle cx="4" cy="4" r="1.5"/><circle cx="12" cy="4" r="1.5"/><circle cx="8" cy="12" r="1.5"/><line x1="5.2" y1="5" x2="7" y2="10.8"/><line x1="10.8" y1="5" x2="9" y2="10.8"/><line x1="5.5" y1="4" x2="10.5" y2="4"/></svg>`,
  initial: false,
  onToggle: (active) => { fiberSection.style.display = active ? '' : 'none'; },
}));
toolsCard.addControl('toggle-style', new CardToggleControl({
  label: 'Style',
  icon: `<svg ${ico16}><circle cx="8" cy="8" r="6"/><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>`,
  initial: false,
  onToggle: (active) => { styleSection.style.display = active ? '' : 'none'; },
}));

panel.register(toolsCard);

/* ── Zoom + Pan card ── */
const zoomCtrl = new ZoomControl({
  onZoom: () => { obs.fitCamera(); obs._updateLabels(); },
  initial: 1.65,
});
obs.zoomCtrl = zoomCtrl;
obs.fitCamera();

const panCtrl = new PanControl({
  onPan: () => { obs.setPan(panCtrl.valueX, panCtrl.valueY); obs._updateLabels(); },
});
obs.onPanChange = (x, y) => panCtrl.update(x, y);

const zoomCard = new CollapsibleCard({ label: 'View', id: 'view' });
zoomCard.addControl('zoom', zoomCtrl);
zoomCard.addControl('pan', panCtrl);
const viewSection = panel.register(zoomCard);
viewSection.style.display = 'none';

/* ── Rotation card ── */
const rotCtrl = new RotationControl({
  onRotate: (axis, radians) => obs.setRotation(axis, radians),
  showTitle: false,
});
obs.onRotationChange = (x, y, z) => rotCtrl.update(x, y, z);

const rotCard = new CollapsibleCard({ label: 'Rotation', id: 'rotation' });
rotCard.addControl('axes', rotCtrl);
const rotSection = panel.register(rotCard);
rotSection.style.display = 'none';

/* ── Filters card ── */
const filtersCard = new CollapsibleCard({ label: 'Filters', id: 'filters', layout: 'row' });
filtersCard.addControl('channels', new RangeControl({
  label: 'Channels',
  onChange: (range) => { obs.channelsRange = range; },
  min: 1, max: 6, initialMin: 1, initialMax: 1,
}));
filtersCard.addControl('events', new RangeControl({
  label: 'Events',
  onChange: (range) => { obs.eventsRange = range; },
  min: 1, max: 10, initialMin: 1, initialMax: 3,
}));
filtersCard.addControl('anchors', new RangeControl({
  label: 'Anchors',
  onChange: (range) => { obs.anchorsRange = range; },
  min: 1, max: 5, initialMin: 1, initialMax: 1,
}));
filtersCard.addControl('paths', new RangeControl({
  label: 'Paths',
  onChange: (range) => { obs.pathsRange = range; },
  min: 1, max: 20, initialMin: 1, initialMax: 5,
}));
filtersCard.addControl('visible-ch', new RangeControl({
  label: 'Visible Ch.',
  onChange: (range) => { obs.visibleChannels = range; },
  min: 0, max: 5, initialMin: 0, initialMax: 0,
}));
const filtersSection = panel.register(filtersCard);
filtersSection.style.display = 'none';

const colorSection = panel.register(new ColorSchemeControl({
  schemes: ColorScheme.presets,
  initial: 'default',
  onScheme: (name) => scheme.set(name),
}));
colorSection.style.display = 'none';

/* ── Fiber bundles ── */
const fiberMgr = new FiberBundleManager({
  pivot: obs._pivot,
  getSpikeInfo: (i) => obs.getSpikeInfo(i),
  observatronAddress: obs.observatronAddress,
});

const fiberCtrl = new FiberBundleControl({
  onToggle: (active) => {
    if (active) { fiberCtrl.setSpikeCount(obs.spikeCount); fiberMgr.showPairs(0, 1); }
    else        { fiberMgr.hidePairs(); }
  },
  onSlide: (spikeIndex) => {
    if (fiberMgr.pairVisible) fiberMgr.showPairs(spikeIndex, fiberCtrl.pairCount);
  },
  onPairsChange: (count) => {
    if (fiberMgr.pairVisible) fiberMgr.showPairs(fiberCtrl.spikeIndex, count);
  },
});

const fiberCard = new CollapsibleCard({ label: 'Fiber Bundles', id: 'fiber-bundles' });
fiberCard.addControl('ring', fiberCtrl);
const fiberSection = panel.register(fiberCard);
fiberSection.style.display = 'none';

/* ── Style card ── */
const styleCtrl = new StyleControl({
  label: 'Facet opacity',
  initial: 90,
  onChange: (opacity) => { obs.facetOpacity = opacity; },
});

const dotRadiusCtrl = new StyleControl({
  label: 'Channel timestamp radius',
  suffix: '%',
  initial: 0,
  onChange: (frac) => { obs.dotScale = 1.0 + frac * 1.5; },
});

const styleCard = new CollapsibleCard({ label: 'Style', id: 'style' });
styleCard.addControl('facet-opacity', styleCtrl);
styleCard.addControl('dot-radius', dotRadiusCtrl);
const styleSection = panel.register(styleCard);
styleSection.style.display = 'none';

/* ── Corner-dot click → animate rotation reset ── */
let resetAnim = null;

const cornerWorld = new THREE.Vector3();
const wrap = document.getElementById('canvas-wrap');

function projectCorner(cx, cy) {
  const h = 0.75;
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
  if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 6) return;
  if (projectCorner(e.clientX, e.clientY) < 20) animateReset();
});

function animateReset() {
  if (resetAnim) cancelAnimationFrame(resetAnim);
  const r = obs._pivot.rotation;
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
