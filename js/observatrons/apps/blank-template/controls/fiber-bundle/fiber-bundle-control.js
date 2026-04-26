export class FiberBundleControl {
  /**
   * @param {object} opts
   * @param {(active: boolean) => void} opts.onToggle — called with true/false
   * @param {boolean} [opts.initial=false]
   */
  constructor({ onToggle, initial = false }) {
    this._onToggle = onToggle;
    this._active = initial;
    this._el = null;
    this._toggle = null;
    this._boundClick = this._handleClick.bind(this);
  }

  get cssURL() {
    return new URL('fiber-bundle-control.css', import.meta.url).href;
  }

  mount() {
    this._el = document.createElement('div');
    this._el.className = 'fiber-bundle-control';

    const label = document.createElement('span');
    label.className = 'fiber-bundle-control__label';
    label.textContent = 'Ring';
    this._el.appendChild(label);

    this._toggle = document.createElement('button');
    this._toggle.className = 'fiber-bundle-control__toggle';
    this._syncState();
    this._toggle.addEventListener('click', this._boundClick);
    this._el.appendChild(this._toggle);

    return this._el;
  }

  dispose() {
    if (this._toggle) this._toggle.removeEventListener('click', this._boundClick);
    this._el = null;
    this._toggle = null;
  }

  _handleClick() {
    this._active = !this._active;
    this._syncState();
    this._onToggle(this._active);
  }

  _syncState() {
    if (!this._toggle) return;
    this._toggle.classList.toggle('fiber-bundle-control__toggle--on', this._active);
    this._toggle.textContent = this._active ? 'On' : 'Off';
    this._toggle.title = this._active ? 'Hide ring' : 'Show ring';
  }
}
