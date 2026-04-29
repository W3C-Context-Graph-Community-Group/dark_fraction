// cgp-html-forms-drag-and-drop.js — Canonical CGP custom element for drag-and-drop observation
import { createObservatron } from './cgp-runtime.js';

class CgpHtmlFormsDragAndDrop extends HTMLElement {
  connectedCallback() {
    // --- Resolve drop target ---
    const cgpTarget = this.getAttribute('cgp-target');

    let dropTarget;
    if (cgpTarget === '') {
      throw new Error('cgp-html-forms-drag-and-drop: cgp-target attribute is present but empty.');
    } else if (cgpTarget !== null) {
      const matches = this.querySelectorAll(cgpTarget);
      if (matches.length === 0) {
        throw new Error(`cgp-html-forms-drag-and-drop: cgp-target="${cgpTarget}" matched zero elements.`);
      }
      if (matches.length > 1) {
        console.warn(`cgp-html-forms-drag-and-drop: cgp-target="${cgpTarget}" matched ${matches.length} elements. Using the first.`);
      }
      dropTarget = matches[0];
    } else {
      dropTarget = this.querySelector(':scope > *:first-child');
    }

    this._dropTarget = dropTarget;
    this._enabled = true;
    this._init();
  }

  async _init() {
    const systemId = this.getAttribute('cgp-system-id') || '0';
    const observatronId = this.getAttribute('cgp-observatron-id') || '0';

    // Fetch event definition JSON
    const base = new URL('.', import.meta.url).href;
    const eventDef = await fetch(new URL('events/state-change.json', base)).then(r => r.json());
    this._eventDefUrl = eventDef.url;

    // Create observatron instance
    this._obs = createObservatron({ systemId, observatronId });

    // Build instance metadata
    const typeUrl = 'cgp:/core/html/forms/drag-and-drop';
    const instanceUrl = this._obs.observatronUrl;
    const attributes = {
      'cgp-target': this.getAttribute('cgp-target') || '',
      'cgp-system-id': systemId,
      'cgp-observatron-id': observatronId
    };

    // Wire up drag-and-drop listeners
    this._wireDragDrop();

    // Dispatch initial state
    this._obs.dispatchStateChange(this._eventDefUrl);

    // Fire instance-ready event so the demo can register this instance
    this.dispatchEvent(new CustomEvent('cgp-instance-ready', {
      bubbles: true,
      detail: { typeUrl, instanceUrl, element: this, attributes }
    }));
  }

  // --- cgpEnabled getter/setter ---
  get cgpEnabled() {
    return this._enabled;
  }

  set cgpEnabled(val) {
    const on = Boolean(val);
    if (on === this._enabled) return;
    this._enabled = on;
    if (on) {
      this._wireDragDrop();
    } else {
      this._unwireDragDrop();
    }
  }

  _wireDragDrop() {
    const target = this._dropTarget;
    if (!target) return;
    if (this._boundHandlers) return; // already wired

    const handlers = {
      dragover: (e) => { e.preventDefault(); target.classList.add('over'); },
      dragleave: () => { target.classList.remove('over'); },
      drop: (e) => { e.preventDefault(); target.classList.remove('over'); this._handleDrop(e); }
    };
    this._boundHandlers = handlers;

    target.addEventListener('dragover', handlers.dragover);
    target.addEventListener('dragleave', handlers.dragleave);
    target.addEventListener('drop', handlers.drop);
  }

  _unwireDragDrop() {
    const target = this._dropTarget;
    if (!target || !this._boundHandlers) return;

    target.removeEventListener('dragover', this._boundHandlers.dragover);
    target.removeEventListener('dragleave', this._boundHandlers.dragleave);
    target.removeEventListener('drop', this._boundHandlers.drop);
    this._boundHandlers = null;
  }

  async _handleDrop(e) {
    if (!this._enabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const eventUrl = this._obs.mintEvent({ channel: 'state-change' });

    files.sort((a, b) => a.name.localeCompare(b.name));

    for (const file of files) {
      const content = await file.text();
      const lines = content.split('\n').filter(line => line.trim() !== '');
      const headers = lines.length > 0 ? lines[0].split(',') : [];
      const dataRows = lines.slice(1);
      const rows = dataRows.length;
      const bytes = file.size;

      const anchorUrl = this._obs.mintAnchor({
        eventUrl,
        filename: file.name,
        content,
        bytes,
        rows
      });

      headers.forEach((header, columnIndex) => {
        const values = dataRows.map(row => row.split(',')[columnIndex] ?? '');
        this._obs.mintPath({
          anchorUrl,
          header: header.trim(),
          values,
          columnIndex
        });
      });
    }

    this._obs.dispatchStateChange(this._eventDefUrl);
  }
}

customElements.define('cgp-html-forms-drag-and-drop', CgpHtmlFormsDragAndDrop);
