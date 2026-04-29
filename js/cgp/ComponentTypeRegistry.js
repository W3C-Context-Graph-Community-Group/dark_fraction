// ComponentTypeRegistry.js — loads and indexes CGP component type definitions

export class ComponentTypeRegistry {
  constructor() {
    this._types = new Map(); // url → type JSON object
  }

  async load(baseHref) {
    const base = baseHref || '';
    // MVP: single hardcoded path
    const paths = [
      'components/core/html/forms/drag-and-drop.json'
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
    return this._types.get(typeUrl);
  }

  has(typeUrl) {
    return this._types.has(typeUrl);
  }

  keys() {
    return this._types.keys();
  }

  entries() {
    return this._types.entries();
  }
}
