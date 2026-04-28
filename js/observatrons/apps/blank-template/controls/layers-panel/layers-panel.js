/**
 * LayersPanel — left sidebar listing observatron IDs with CGP URLs.
 * Resizable via drag handle on right edge.
 */
export class LayersPanel {
  get cssURL() { return new URL('layers-panel.css', import.meta.url).href; }

  /**
   * @param {object} opts
   * @param {function} [opts.onResize] — called with current width after drag
   * @param {number}   [opts.initialWidth=350]
   * @param {number}   [opts.minWidth=200]
   * @param {number}   [opts.maxWidth=600]
   */
  constructor({ onResize, initialWidth = 350, minWidth = 200, maxWidth = 600 } = {}) {
    this._onResize = onResize || null;
    this._width = initialWidth;
    this._minWidth = minWidth;
    this._maxWidth = maxWidth;
    this._el = null;
    this._listEl = null;
    this._resizer = null;
  }

  mount() {
    this._el = document.createElement('div');
    this._el.className = 'layers-panel';

    // header
    const header = document.createElement('div');
    header.className = 'layers-panel__header';
    header.textContent = 'Layers';
    this._el.appendChild(header);

    // list
    this._listEl = document.createElement('div');
    this._listEl.className = 'layers-panel__list';
    this._el.appendChild(this._listEl);

    // resizer
    this._resizer = document.createElement('div');
    this._resizer.className = 'layers-panel__resizer';
    this._el.appendChild(this._resizer);

    this._setWidth(this._width);
    this._initResize();

    return this._el;
  }

  /**
   * Rebuild list items.
   * @param {Array<{ id: string, url: string }>} entries
   */
  setEntries(entries) {
    if (!this._listEl) return;
    this._listEl.innerHTML = '';
    for (const entry of entries) {
      const item = document.createElement('div');
      item.className = 'layers-panel__item';
      item.setAttribute('data-cgp-observatron_id', entry.id);
      item.textContent = entry.url;
      this._listEl.appendChild(item);
    }
  }

  dispose() {
    if (this._el) this._el.remove();
  }

  // ── private ──

  _setWidth(w) {
    this._width = Math.max(this._minWidth, Math.min(this._maxWidth, w));
    document.documentElement.style.setProperty('--lp-width', this._width + 'px');
  }

  _initResize() {
    const resizer = this._resizer;

    const onPointerDown = (e) => {
      e.preventDefault();
      resizer.setPointerCapture(e.pointerId);
      resizer.classList.add('layers-panel__resizer--active');

      const onPointerMove = (e2) => {
        this._setWidth(e2.clientX);
        if (this._onResize) this._onResize(this._width);
      };

      const onPointerUp = () => {
        resizer.classList.remove('layers-panel__resizer--active');
        resizer.removeEventListener('pointermove', onPointerMove);
        resizer.removeEventListener('pointerup', onPointerUp);
      };

      resizer.addEventListener('pointermove', onPointerMove);
      resizer.addEventListener('pointerup', onPointerUp);
    };

    resizer.addEventListener('pointerdown', onPointerDown);
  }
}
