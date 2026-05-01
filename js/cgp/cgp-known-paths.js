// cgp-known-paths.js — browser manifest of all known CGP .json paths
//
// Used by CgpFetchBackend.walk() to discover available CGP URLs
// without server-side directory listing.

export const CGP_KNOWN_PATHS = [
  'root/events/observatron/state-change.json',
  'core/html/forms/drag-and-drop.json'
];
