/**
 * compareState(actual, expected) → { match: boolean, diffs: [] }
 *
 * For each URL key in `expected`, checks it exists in `actual`.
 * For each facet of each URL, deep-compares values.
 * Skips `/context.timestamp` arrays (timestamps vary per run).
 * Returns list of diffs as { url, facet, key, expected, actual }.
 */
export function compareState(actual, expected) {
  const diffs = [];

  for (const url of Object.keys(expected)) {
    if (!(url in actual)) {
      diffs.push({ url, facet: null, key: null, expected: '(present)', actual: '(missing)' });
      continue;
    }
    const expFacets = expected[url];
    const actFacets = actual[url];

    for (const facet of Object.keys(expFacets)) {
      if (!(facet in actFacets)) {
        diffs.push({ url, facet, key: null, expected: '(present)', actual: '(missing)' });
        continue;
      }
      const expObj = expFacets[facet];
      const actObj = actFacets[facet];

      for (const key of Object.keys(expObj)) {
        // Skip timestamp arrays — they vary per run
        if (facet === '/context' && key === 'timestamp') continue;

        const expVal = expObj[key];
        const actVal = actObj[key];

        if (!deepEqual(expVal, actVal)) {
          diffs.push({
            url, facet, key,
            expected: JSON.stringify(expVal),
            actual: JSON.stringify(actVal)
          });
        }
      }
    }
  }

  return { match: diffs.length === 0, diffs };
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeof a === 'object') {
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every(k => deepEqual(a[k], b[k]));
  }
  return false;
}
