// cgp-drag-and-drop.js — Custom Element for CGP drag-and-drop observation
import { createObservatron } from './cgp-runtime.js';

class CgpDragAndDrop extends HTMLElement {
  connectedCallback() {
    const systemId = this.getAttribute('system-id');
    const observatronId = this.getAttribute('observatron-id');

    // --- Resolve drop target (section 4 of roadmap) ---
    const cgpTarget = this.getAttribute('cgp-target');

    let dropTarget;
    if (cgpTarget === '') {
      // Rule 5: attribute present but empty
      throw new Error('cgp-drag-and-drop: cgp-target attribute is present but empty.');
    } else if (cgpTarget !== null) {
      // Attribute present with a selector
      const matches = this.querySelectorAll(cgpTarget);
      if (matches.length === 0) {
        // Rule 3: selector matches zero elements
        throw new Error(`cgp-drag-and-drop: cgp-target="${cgpTarget}" matched zero elements.`);
      }
      if (matches.length > 1) {
        // Rule 2: multiple matches — use first, warn
        console.warn(`cgp-drag-and-drop: cgp-target="${cgpTarget}" matched ${matches.length} elements. Using the first.`);
      }
      // Rule 1: use the (first) match
      dropTarget = matches[0];
    } else {
      // Rule 4: attribute missing — fall back to first child
      dropTarget = this.querySelector(':scope > *:first-child');
    }

    this._dropTarget = dropTarget;

    // --- Load event definition and initialize observatron ---
    this._init(systemId, observatronId);
  }

  async _init(systemId, observatronId) {
    // Fetch event definition JSON (portable, no JSON import assertion needed)
    const base = new URL('.', import.meta.url).href;
    const eventDef = await fetch(new URL('events/state-change.json', base)).then(r => r.json());
    this._eventDefUrl = eventDef.url;

    // Create observatron instance
    this._obs = createObservatron({ systemId, observatronId });

    // Dispatch initial state on load
    this._obs.dispatchStateChange(this._eventDefUrl);

    // --- Wire up drag-and-drop on the resolved target ---
    const target = this._dropTarget;
    if (!target) return;

    target.addEventListener('dragover', (e) => {
      e.preventDefault();
      target.classList.add('over');
    });
    target.addEventListener('dragleave', () => {
      target.classList.remove('over');
    });
    target.addEventListener('drop', (e) => {
      e.preventDefault();
      target.classList.remove('over');
      this._handleDrop(e);
    });
  }

  async _handleDrop(e) {
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return; // Zero files: no minting, no dispatch

    // 1. Mint ONE event under state-change channel
    const eventUrl = this._obs.mintEvent({ channel: 'state-change' });

    // 2. Sort files alphabetically by filename
    files.sort((a, b) => a.name.localeCompare(b.name));

    for (const file of files) {
      // 2a. Read file as text
      const content = await file.text();

      // 2c. Parse CSV: split on \n, then on ,
      const lines = content.split('\n').filter(line => line.trim() !== '');
      const headers = lines.length > 0 ? lines[0].split(',') : [];
      const dataRows = lines.slice(1);
      const rows = dataRows.length;
      const bytes = file.size;

      // 2b. Mint ONE anchor under the event
      const anchorUrl = this._obs.mintAnchor({
        eventUrl,
        filename: file.name,
        content,
        bytes,
        rows
      });

      // 2d. For each column in the CSV, mint a path
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

    // 3. Dispatch cgp-state-change once after all minting
    this._obs.dispatchStateChange(this._eventDefUrl);
  }
}

customElements.define('cgp-drag-and-drop', CgpDragAndDrop);
