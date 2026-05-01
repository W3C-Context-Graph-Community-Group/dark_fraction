// CgpFetchBackend.js — browser backend for CGP resolver
//
// Uses fetch() for reads. Writes update cache only (no server-side persistence).
// Walk/list use a known-paths manifest provided at construction time.

import { cgpUrlToRelPath, relPathToCgpUrl } from './CgpUrlMap.js';

export class CgpFetchBackend {
  /**
   * @param {string} baseHref  - base URL to prepend to relative paths (e.g. '../cgp/')
   * @param {string[]} knownPaths - list of relative .json paths for walk()
   */
  constructor(baseHref, knownPaths) {
    this._baseHref = baseHref.endsWith('/') ? baseHref : baseHref + '/';
    this._knownPaths = knownPaths || [];
  }

  /** Fetch and parse JSON for a CGP URL. */
  async read(cgpUrl) {
    const rel = cgpUrlToRelPath(cgpUrl);
    const url = this._baseHref + rel;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  /** No-op in browser — logs a warning. */
  async write(cgpUrl, data) {
    console.warn(`CgpFetchBackend: write() is a no-op in the browser (url: ${cgpUrl})`);
  }

  /** Check existence via HEAD request. */
  async has(cgpUrl) {
    const rel = cgpUrlToRelPath(cgpUrl);
    const url = this._baseHref + rel;
    try {
      const res = await fetch(url, { method: 'HEAD' });
      return res.ok;
    } catch {
      return false;
    }
  }

  /** Return all known CGP URLs from the manifest. */
  async walk() {
    return this._knownPaths.map(p => relPathToCgpUrl(p));
  }

  /** Filter known paths for immediate children of a prefix. */
  async list(cgpUrlPrefix) {
    const prefix = cgpUrlPrefix.endsWith('/') ? cgpUrlPrefix : cgpUrlPrefix + '/';
    const urls = this._knownPaths.map(p => relPathToCgpUrl(p));
    return urls.filter(u => {
      if (!u.startsWith(prefix)) return false;
      // Immediate child: no additional '/' after the prefix
      const tail = u.slice(prefix.length);
      return tail.length > 0 && !tail.includes('/');
    });
  }
}
