// ComponentTypeRegistry.js — loads and indexes CGP component type definitions

export class ComponentTypeRegistry {
  constructor({ resolver } = {}) {
    this._types = new Map(); // url → type JSON object
    this._resolver = resolver || null;
  }

  async load(baseHref) {
    // If resolver is available, index cgp:/core/* entries from it
    if (this._resolver) {
      for (const url of this._resolver.urls()) {
        if (url.startsWith('cgp:/core/')) {
          const def = this._resolver.resolve(url);
          if (def && def.url) {
            this._types.set(def.url, def);
          }
        }
      }
      return;
    }

    // Fallback: fetch with updated path
    const base = baseHref || '';
    const paths = [
      'cgp/core/html/forms/drag-and-drop.json'
    ];

    for (const path of paths) {
      const url = base + path;
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`ComponentTypeRegistry: failed to load ${url} (${res.status})`);
        continue;
      }
      const def = await res.json();
      if (def.url) {
        this._types.set(def.url, def);
      }
    }
  }

  get(typeUrl) {
    if (this._resolver && this._resolver.has(typeUrl)) {
      return this._resolver.resolve(typeUrl);
    }
    return this._types.get(typeUrl);
  }

  has(typeUrl) {
    if (this._resolver && this._resolver.has(typeUrl)) {
      return true;
    }
    return this._types.has(typeUrl);
  }

  keys() {
    return this._types.keys();
  }

  entries() {
    return this._types.entries();
  }
}
