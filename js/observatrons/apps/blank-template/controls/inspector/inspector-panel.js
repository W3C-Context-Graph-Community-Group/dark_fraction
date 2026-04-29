/**
 * Right-column inspector panel with resizable width and tabbed views.
 */
export class InspectorPanel {
  /**
   * @param {object} opts
   * @param {number} [opts.initialWidth=320] — starting width in px
   * @param {number} [opts.minWidth=200]
   * @param {number} [opts.maxWidth=600]
   * @param {function} [opts.onResize] — called with (width) after resize
   */
  constructor({ initialWidth = 320, minWidth = 200, maxWidth = 600, onResize } = {}) {
    this._width = initialWidth;
    this._minWidth = minWidth;
    this._maxWidth = maxWidth;
    this._onResize = onResize || null;
    this._activeTab = 'inspector';
    this._selectedId = null;

    this.cssURL = new URL('inspector-panel.css', import.meta.url).href;
  }

  mount() {
    const el = document.createElement('div');
    el.className = 'inspector-panel';
    el.style.setProperty('--inspector-width', this._width + 'px');
    this._el = el;

    // ── Resizer ──
    const resizer = document.createElement('div');
    resizer.className = 'inspector-panel__resizer';
    el.appendChild(resizer);
    this._initResize(resizer);

    // ── Tabs ──
    const tabs = document.createElement('div');
    tabs.className = 'inspector-panel__tabs';

    this._inspectorTab = this._createTab('Inspector', 'inspector');
    this._jsonTab = this._createTab('JSON', 'json');
    tabs.appendChild(this._inspectorTab);
    tabs.appendChild(this._jsonTab);
    el.appendChild(tabs);

    // ── Body ──
    this._body = document.createElement('div');
    this._body.className = 'inspector-panel__body';
    el.appendChild(this._body);

    this._setTab('inspector');
    this._renderBody();
    return el;
  }

  get width() { return this._width; }

  /** Show an observatron by ID in the inspector view. */
  showObservatron(id) {
    this._selectedId = id;
    this._renderBody();
  }

  clear() {
    this._selectedId = null;
    this._renderBody();
  }

  _createTab(label, key) {
    const btn = document.createElement('button');
    btn.className = 'inspector-panel__tab';
    btn.textContent = label;
    btn.addEventListener('click', () => this._setTab(key));
    return btn;
  }

  _setTab(key) {
    this._activeTab = key;
    this._inspectorTab.classList.toggle('inspector-panel__tab--active', key === 'inspector');
    this._jsonTab.classList.toggle('inspector-panel__tab--active', key === 'json');
    this._renderBody();
  }

  _renderBody() {
    if (!this._body) return;
    this._body.innerHTML = '';

    if (this._selectedId == null) {
      const empty = document.createElement('div');
      empty.className = 'inspector-panel__empty';
      empty.textContent = 'Click an observatron to inspect';
      this._body.appendChild(empty);
      return;
    }

    if (this._activeTab === 'inspector') {
      const lbl = document.createElement('div');
      lbl.className = 'inspector-panel__field-label';
      lbl.textContent = 'Observatron ID';
      const val = document.createElement('div');
      val.className = 'inspector-panel__field-value';
      val.textContent = this._selectedId;
      this._body.appendChild(lbl);
      this._body.appendChild(val);
    } else {
      const empty = document.createElement('div');
      empty.className = 'inspector-panel__empty';
      empty.textContent = 'JSON view (coming soon)';
      this._body.appendChild(empty);
    }
  }

  _initResize(handle) {
    let startX, startW;

    const onMove = (e) => {
      const dx = startX - e.clientX;
      const w = Math.min(this._maxWidth, Math.max(this._minWidth, startW + dx));
      this._width = w;
      this._el.style.setProperty('--inspector-width', w + 'px');
      if (this._onResize) this._onResize(w);
    };

    const onUp = () => {
      this._el.classList.remove('inspector-panel--resizing');
      removeEventListener('mousemove', onMove);
      removeEventListener('mouseup', onUp);
    };

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      startX = e.clientX;
      startW = this._width;
      this._el.classList.add('inspector-panel--resizing');
      addEventListener('mousemove', onMove);
      addEventListener('mouseup', onUp);
    });
  }

  dispose() {
    if (this._el) this._el.remove();
  }
}
