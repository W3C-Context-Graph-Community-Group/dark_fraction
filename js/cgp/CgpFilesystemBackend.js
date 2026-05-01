// CgpFilesystemBackend.js — Node.js backend for CGP resolver
//
// Storage layout:
//   rootDir/
//     core/html/forms/drag-and-drop.json          <- cgp:/core/html/forms/drag-and-drop
//     root/events/observatron/state-change.json    <- cgp:/root/events/observatron/state-change
//     s/0/o/0.json                                 <- cgp:/s/0/o/0
//     s/0/o/0/c/state-change/0/a/0/p/0.json        <- cgp:/s/0/o/0/c/state-change/0/a/0/p/0
//
// A URL with children has BOTH a .json file AND a same-named sibling directory.
// The .json holds the URL's own four facets; the directory holds children.

import { readFile, writeFile, mkdir, access, readdir, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { cgpUrlToRelPath, relPathToCgpUrl } from './CgpUrlMap.js';

export class CgpFilesystemBackend {
  constructor(rootDir) {
    this._rootDir = rootDir;
  }

  /** Read and parse JSON for a CGP URL. Returns parsed object or null. */
  async read(cgpUrl) {
    const rel = cgpUrlToRelPath(cgpUrl);
    const abs = join(this._rootDir, rel);
    try {
      const raw = await readFile(abs, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      if (err.code === 'ENOENT') return null;
      throw err;
    }
  }

  /** Write JSON for a CGP URL. Creates parent directories as needed. */
  async write(cgpUrl, data) {
    const rel = cgpUrlToRelPath(cgpUrl);
    const abs = join(this._rootDir, rel);
    const dir = abs.slice(0, abs.lastIndexOf(sep) === -1 ? undefined : abs.lastIndexOf(sep));
    await mkdir(dir, { recursive: true });
    await writeFile(abs, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  }

  /** Check whether a .json file exists for a CGP URL. */
  async has(cgpUrl) {
    const rel = cgpUrlToRelPath(cgpUrl);
    const abs = join(this._rootDir, rel);
    try {
      await access(abs);
      return true;
    } catch {
      return false;
    }
  }

  /** Recursively walk rootDir, return all .json files as CGP URLs. */
  async walk() {
    const urls = [];
    await this._walkDir(this._rootDir, urls);
    return urls;
  }

  async _walkDir(dir, urls) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await this._walkDir(full, urls);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        const rel = relative(this._rootDir, full).split(sep).join('/');
        urls.push(relPathToCgpUrl(rel));
      }
    }
  }

  /** List immediate children of a CGP URL prefix (reads the directory). */
  async list(cgpUrlPrefix) {
    // The prefix's children live in a directory with the same name (minus .json)
    const rel = cgpUrlToRelPath(cgpUrlPrefix);
    const dirPath = join(this._rootDir, rel.slice(0, -'.json'.length));
    const children = [];
    let entries;
    try {
      entries = await readdir(dirPath, { withFileTypes: true });
    } catch {
      return children;
    }
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
        const childRel = relative(this._rootDir, join(dirPath, entry.name)).split(sep).join('/');
        children.push(relPathToCgpUrl(childRel));
      }
    }
    return children;
  }
}
