// CgpResolver.js — cached resolver wrapping any backend (filesystem or fetch)
//
// The resolver holds an in-memory cache populated from the backend on init().
// Reads are synchronous cache lookups. Writes update cache first, then
// delegate to the backend (fire-and-forget for the fetch backend, persisted
// for the filesystem backend).

export class CgpResolver {
  constructor(backend) {
    this._backend = backend;
    this._cache = new Map(); // cgpUrl -> parsed JSON object
  }

  /** Populate cache by walking the backend and reading every URL. */
  async init() {
    const urls = await this._backend.walk();
    const reads = urls.map(async (url) => {
      const data = await this._backend.read(url);
      if (data != null) {
        this._cache.set(url, data);
      }
    });
    await Promise.all(reads);
  }

  /** Synchronous cache lookup. Returns the JSON object or null. */
  resolve(url) {
    return this._cache.get(url) ?? null;
  }

  /** Check whether a URL is in the cache. */
  has(url) {
    return this._cache.has(url);
  }

  /** Return all cached URL keys. */
  urls() {
    return Array.from(this._cache.keys());
  }

  /** Write data to cache and backend. */
  async write(url, data) {
    this._cache.set(url, data);
    await this._backend.write(url, data);
  }

  /** Wrap facets in the standard { url, facets } shape and write. */
  async writeFacets(url, facets) {
    const data = { url, facets };
    await this.write(url, data);
  }

  /** List immediate children of a prefix from the cache. */
  list(prefix) {
    const p = prefix.endsWith('/') ? prefix : prefix + '/';
    const results = [];
    for (const key of this._cache.keys()) {
      if (key.startsWith(p)) {
        const tail = key.slice(p.length);
        if (tail.length > 0 && !tail.includes('/')) {
          results.push(key);
        }
      }
    }
    return results;
  }

  /** Iterator of [url, data] pairs — compat with existing registries. */
  entries() {
    return this._cache.entries();
  }

  /** Number of cached entries. */
  get size() {
    return this._cache.size;
  }
}
