// ComponentInstanceRegistry.js — stores registered CGP component instances

export class ComponentInstanceRegistry {
  constructor({ resolver } = {}) {
    this._instances = new Map(); // instanceUrl → entry
    this._resolver = resolver || null;
  }

  register({ instanceUrl, typeUrl, element, attributes }) {
    const entry = {
      instanceUrl,
      typeUrl,
      element,
      attributes,
      facets: {
        "/data":      {},
        "/meaning":   { "symbol": ["component-type"], "meaning": [typeUrl] },
        "/structure": { "constraint-key": Object.keys(attributes), "constraint-value": Object.values(attributes) },
        "/context":   { "anchor": [instanceUrl], "source": [instanceUrl], "channel": ["cgp:/root/events/observatron/instance-registered"], "timestamp": [new Date().toISOString()], "key": ["typeUrl"], "value": [typeUrl] }
      }
    };
    this._instances.set(instanceUrl, entry);

    if (this._resolver) {
      this._resolver.writeFacets(instanceUrl, entry.facets).catch(() => {});
    }

    return entry;
  }

  get(instanceUrl) {
    return this._instances.get(instanceUrl);
  }

  has(instanceUrl) {
    return this._instances.has(instanceUrl);
  }

  get size() {
    return this._instances.size;
  }

  entries() {
    return this._instances.entries();
  }

  toArray() {
    return Array.from(this._instances.values());
  }
}
