// ComponentInstanceRegistry.js — stores registered CGP component instances

export class ComponentInstanceRegistry {
  constructor() {
    this._instances = new Map(); // instanceUrl → entry
  }

  register({ instanceUrl, typeUrl, element, attributes }) {
    const entry = {
      instanceUrl,
      typeUrl,
      element,
      attributes,
      facets: {
        "/data":      { "anchor": [instanceUrl] },
        "/meaning":   { "symbol": ["component-type"], "meaning": [typeUrl] },
        "/structure": { "constraint-key": Object.keys(attributes), "constraint-value": Object.values(attributes) },
        "/context":   { "timestamp": [new Date().toISOString()], "channel": ["instance-registered"], "key": ["typeUrl"], "value": [typeUrl] }
      }
    };
    this._instances.set(instanceUrl, entry);
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
