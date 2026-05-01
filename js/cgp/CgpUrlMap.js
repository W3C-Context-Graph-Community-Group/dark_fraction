// CgpUrlMap.js — pure URL <-> filesystem path mapping
//
// CGP URL scheme:  cgp:/core/html/forms/drag-and-drop
// Filesystem path: core/html/forms/drag-and-drop.json  (relative to rootDir)
//
// Bidirectional and lossless.

const WINDOWS_RESERVED = /^(CON|PRN|AUX|NUL|COM\d|LPT\d)$/i;
const INVALID_CHARS    = /[<>:"|?*\x00-\x1f\\]/;

/**
 * Validate a single path segment. Rejects characters that are invalid on
 * Windows/POSIX and Windows reserved device names.
 */
export function validateSegment(seg) {
  if (typeof seg !== 'string' || seg.length === 0) {
    throw new Error(`CgpUrlMap: segment must be a non-empty string, got ${JSON.stringify(seg)}`);
  }
  if (INVALID_CHARS.test(seg)) {
    throw new Error(`CgpUrlMap: segment contains invalid characters: ${JSON.stringify(seg)}`);
  }
  if (WINDOWS_RESERVED.test(seg)) {
    throw new Error(`CgpUrlMap: segment is a reserved name: ${JSON.stringify(seg)}`);
  }
  return seg;
}

/**
 * Convert a CGP URL to a relative filesystem path (with .json extension).
 * cgp:/core/html/forms/drag-and-drop  ->  core/html/forms/drag-and-drop.json
 */
export function cgpUrlToRelPath(url) {
  if (!url.startsWith('cgp:/')) {
    throw new Error(`CgpUrlMap: expected url starting with "cgp:/", got ${JSON.stringify(url)}`);
  }
  const stripped = url.slice('cgp:/'.length);
  if (stripped.length === 0) {
    throw new Error('CgpUrlMap: url has no path after "cgp:/"');
  }
  const segments = stripped.split('/');
  segments.forEach(validateSegment);
  return stripped + '.json';
}

/**
 * Convert a relative filesystem path (.json) back to a CGP URL.
 * core/html/forms/drag-and-drop.json  ->  cgp:/core/html/forms/drag-and-drop
 */
export function relPathToCgpUrl(path) {
  if (!path.endsWith('.json')) {
    throw new Error(`CgpUrlMap: expected path ending with ".json", got ${JSON.stringify(path)}`);
  }
  const stripped = path.slice(0, -'.json'.length);
  if (stripped.length === 0) {
    throw new Error('CgpUrlMap: path has no name before ".json"');
  }
  return 'cgp:/' + stripped;
}

/**
 * Convert a CGP URL to an absolute filesystem path.
 */
export function cgpUrlToAbsPath(url, rootDir) {
  const rel = cgpUrlToRelPath(url);
  // Use forward-slash join — works on both POSIX and when rootDir uses forward slashes
  const root = rootDir.endsWith('/') ? rootDir : rootDir + '/';
  return root + rel;
}

/**
 * Convert an absolute filesystem path back to a CGP URL.
 */
export function absPathToCgpUrl(absPath, rootDir) {
  const root = rootDir.endsWith('/') ? rootDir : rootDir + '/';
  if (!absPath.startsWith(root)) {
    throw new Error(`CgpUrlMap: absPath ${JSON.stringify(absPath)} is not under rootDir ${JSON.stringify(root)}`);
  }
  const rel = absPath.slice(root.length);
  return relPathToCgpUrl(rel);
}
