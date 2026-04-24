import { Observatron }         from '../../core/observatron.js';
import { ColorScheme }         from './color-scheme.js';
import { ControlPanel }        from './controls/control-panel.js';
import { ZoomControl }         from './controls/zoom/zoom-control.js';
import { SaveImageControl }    from './controls/save-image/save-image-control.js';
import { LegendControl }       from './controls/legend/legend-control.js';
import { ColorSchemeControl }  from './controls/color-scheme/color-scheme-control.js';

const scheme = new ColorScheme('default');
const obs = new Observatron(document.getElementById('canvas-wrap'));
obs.colorScheme = scheme;
obs.exec('seed', { seed: 0xC6A107 });

const panel = new ControlPanel();
panel.register(new LegendControl());
panel.register(new SaveImageControl({
  onSave: () => obs.saveImage('observatron.png'),
}));

const zoomCtrl = new ZoomControl({
  onZoom: () => { obs.fitCamera(); obs._updateLabels(); },
  initial: 2,
});
obs.zoomCtrl = zoomCtrl;
obs.fitCamera();
panel.register(zoomCtrl);

panel.register(new ColorSchemeControl({
  schemes: ColorScheme.presets,
  initial: 'default',
  onScheme: (name) => scheme.set(name),
}));
