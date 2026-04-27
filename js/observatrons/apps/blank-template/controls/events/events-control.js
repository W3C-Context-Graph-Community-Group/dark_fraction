export class EventsControl {
  /**
   * @param {object} opts
   * @param {(connectionIds: string[]) => void} opts.onCompare — called with all listed connection ids
   */
  constructor({ onCompare }) {
    this._onCompare = onCompare;
    this._connections = [];    // { id, source, target }
    this._active = false;
    this._el = null;
    this._list = null;
    this._compareBtn = null;
    this._emptyMsg = null;
  }

  get cssURL() {
    return new URL('events-control.css', import.meta.url).href;
  }

  mount() {
    this._el = document.createElement('div');
    this._el.className = 'events-control';

    // Connection list container
    this._list = document.createElement('div');
    this._list.style.cssText = 'display:flex; flex-direction:column; gap:4px';
    this._el.appendChild(this._list);

    // Empty state message
    this._emptyMsg = document.createElement('span');
    this._emptyMsg.className = 'events-control__empty';
    this._emptyMsg.textContent = 'No connections';
    this._list.appendChild(this._emptyMsg);

    // Compare button row
    const btnRow = document.createElement('div');
    btnRow.className = 'events-control__row';

    this._compareBtn = document.createElement('button');
    this._compareBtn.className = 'events-control__btn';
    this._compareBtn.textContent = 'Compare';
    this._compareBtn.addEventListener('click', () => this._handleCompare());
    btnRow.appendChild(this._compareBtn);

    this._el.appendChild(btnRow);

    return this._el;
  }

  /**
   * Update the displayed connections list.
   * @param {{ id: string, source: { nodeId: number, spikeIndex: number }, target: { nodeId: number, spikeIndex: number } }[]} connections
   */
  updateConnectionsList(connections) {
    this._connections = connections;
    if (!this._list) return;

    this._list.innerHTML = '';

    if (connections.length === 0) {
      this._emptyMsg = document.createElement('span');
      this._emptyMsg.className = 'events-control__empty';
      this._emptyMsg.textContent = 'No connections';
      this._list.appendChild(this._emptyMsg);
      // Reset active state when connections change
      this._active = false;
      this._syncBtn();
      return;
    }

    for (const conn of connections) {
      const row = document.createElement('div');
      row.className = 'events-control__row';

      const label = document.createElement('span');
      label.className = 'events-control__label';
      label.textContent = `${conn.source.nodeId}:${conn.source.spikeIndex} \u2192 ${conn.target.nodeId}:${conn.target.spikeIndex}`;
      row.appendChild(label);

      this._list.appendChild(row);
    }

    // Reset active state when connections change
    this._active = false;
    this._syncBtn();
  }

  dispose() {
    this._el = null;
    this._list = null;
    this._compareBtn = null;
    this._emptyMsg = null;
  }

  _handleCompare() {
    if (this._connections.length === 0) return;
    this._active = !this._active;
    this._syncBtn();
    const ids = this._connections.map(c => c.id);
    this._onCompare(ids);
  }

  _syncBtn() {
    if (!this._compareBtn) return;
    this._compareBtn.classList.toggle('events-control__btn--active', this._active);
  }
}
