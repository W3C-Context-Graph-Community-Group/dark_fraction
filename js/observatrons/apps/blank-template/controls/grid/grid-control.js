export class GridControl {
  /**
   * @param {object} opts
   * @param {(active: boolean) => void} opts.onToggle - called with true/false
   */
  constructor({ onToggle }) {
    this._onToggle = onToggle;
    this._active = false;
    this._el = null;
    this._btn = null;
    this._boundClick = this._handleClick.bind(this);
  }

  get cssURL() {
    return new URL('grid-control.css', import.meta.url).href;
  }

  mount() {
    this._el = document.createElement('div');
    this._el.className = 'grid-control';

    this._btn = document.createElement('button');
    this._btn.className = 'grid-control__btn';
    this._btn.title = 'Toggle grid';
    this._btn.innerHTML =
      `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">` +
        `<circle cx="3" cy="3" r="1.2"/>` +
        `<circle cx="8" cy="3" r="1.2"/>` +
        `<circle cx="13" cy="3" r="1.2"/>` +
        `<circle cx="3" cy="8" r="1.2"/>` +
        `<circle cx="8" cy="8" r="1.2"/>` +
        `<circle cx="13" cy="8" r="1.2"/>` +
        `<circle cx="3" cy="13" r="1.2"/>` +
        `<circle cx="8" cy="13" r="1.2"/>` +
        `<circle cx="13" cy="13" r="1.2"/>` +
      `</svg>`;
    this._btn.addEventListener('click', this._boundClick);
    this._el.appendChild(this._btn);

    const lbl = document.createElement('span');
    lbl.className = 'grid-control__label';
    lbl.textContent = 'Grid';
    this._el.appendChild(lbl);

    return this._el;
  }

  dispose() {
    if (this._btn) this._btn.removeEventListener('click', this._boundClick);
    this._el = null;
    this._btn = null;
  }

  _handleClick() {
    this._active = !this._active;
    this._btn.classList.toggle('grid-control__btn--active', this._active);
    this._onToggle(this._active);
  }
}
