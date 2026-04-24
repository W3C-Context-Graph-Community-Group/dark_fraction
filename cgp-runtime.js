// cgp-runtime.js — UrlManager + createObservatron factory
// Facet storage is COLUMNAR everywhere: struct of arrays, not array of structs.

export class UrlManager {
  constructor() {
    this.counters = new Map(); // keyed by parent URL → next integer
  }

  mintSystem(id) {
    return `cgp:/s/${id}`;
  }

  mintObservatron(systemUrl, id) {
    return `${systemUrl}/o/${id}`;
  }

  // Auto-incremented per (observatron, channel) pair
  mintEvent(observatronUrl, channelName) {
    const key = `${observatronUrl}/c/${channelName}`;
    const n = this.counters.get(key) ?? 0;
    this.counters.set(key, n + 1);
    return `${observatronUrl}/c/${channelName}/${n}`;
  }

  // Auto-incremented per event
  mintAnchor(eventUrl) {
    const n = this.counters.get(eventUrl) ?? 0;
    this.counters.set(eventUrl, n + 1);
    return `${eventUrl}/a/${n}`;
  }

  // Auto-incremented per anchor
  mintPath(anchorUrl) {
    const n = this.counters.get(anchorUrl) ?? 0;
    this.counters.set(anchorUrl, n + 1);
    return `${anchorUrl}/p/${n}`;
  }
}

function emptyFacets() {
  return {
    "/data":      { "anchor": [] },
    "/meaning":   { "symbol": [], "meaning": [] },
    "/structure": { "constraint-key": [], "constraint-value": [] },
    "/context":   { "timestamp": [], "channel": [], "key": [], "value": [] }
  };
}

export function createObservatron({ systemId, observatronId, urlManager }) {
  const um = urlManager || new UrlManager();
  const store = {}; // flat URL-keyed map of facet stores

  const systemUrl = um.mintSystem(systemId);
  const observatronUrl = um.mintObservatron(systemUrl, observatronId);

  // --- Helper: write full four-facet set for a URL ---
  function writeFacets(url, facets) {
    store[url] = facets;
  }

  // --- appendContext: push one row onto the four column arrays in lockstep ---
  function appendContext({ url, channel, key, value }) {
    const ctx = store[url]["/context"];
    const ts = new Date().toISOString();
    ctx.timestamp.push(ts);
    ctx.channel.push(channel);
    ctx.key.push(key);
    ctx.value.push(value);
  }

  // --- Initialize system node ---
  const systemFacets = emptyFacets();
  systemFacets["/data"].anchor = [systemUrl];
  systemFacets["/meaning"].symbol = [systemUrl];
  systemFacets["/meaning"].meaning = ["user system"];
  systemFacets["/structure"]["constraint-key"] = ["kind"];
  systemFacets["/structure"]["constraint-value"] = ["system"];
  writeFacets(systemUrl, systemFacets);
  appendContext({ url: systemUrl, channel: "system-instantiated", key: "systemId", value: systemId });

  // --- Initialize observatron node ---
  const obsFacets = emptyFacets();
  obsFacets["/data"].anchor = [observatronUrl];
  obsFacets["/meaning"].symbol = [observatronUrl];
  obsFacets["/meaning"].meaning = ["observatron"];
  obsFacets["/structure"]["constraint-key"] = ["kind"];
  obsFacets["/structure"]["constraint-value"] = ["observatron"];
  writeFacets(observatronUrl, obsFacets);
  appendContext({ url: observatronUrl, channel: "observatron-bound", key: "observatronId", value: observatronId });

  // --- Public API ---
  function mintEvent({ channel }) {
    const eventUrl = um.mintEvent(observatronUrl, channel);
    const facets = emptyFacets();
    facets["/data"].anchor = [eventUrl];
    facets["/meaning"].symbol = [eventUrl];
    facets["/meaning"].meaning = [channel];
    facets["/structure"]["constraint-key"] = ["kind"];
    facets["/structure"]["constraint-value"] = ["event"];
    writeFacets(eventUrl, facets);
    appendContext({ url: eventUrl, channel: "event-fired", key: "trigger", value: "drop" });
    return eventUrl;
  }

  function mintAnchor({ eventUrl, filename, content, bytes, rows }) {
    const anchorUrl = um.mintAnchor(eventUrl);
    const facets = emptyFacets();
    facets["/data"].anchor = [anchorUrl];
    facets["/meaning"].symbol = [anchorUrl];
    facets["/meaning"].meaning = [filename];
    facets["/structure"]["constraint-key"] = ["kind", "format", "bytes", "rows"];
    facets["/structure"]["constraint-value"] = ["anchor", "csv", bytes, rows];
    writeFacets(anchorUrl, facets);
    appendContext({ url: anchorUrl, channel: "anchor-minted", key: "filename", value: filename });
    return anchorUrl;
  }

  function mintPath({ anchorUrl, header, values, columnIndex }) {
    const pathUrl = um.mintPath(anchorUrl);
    const facets = emptyFacets();
    facets["/data"].anchor = [pathUrl];
    facets["/meaning"].symbol = [pathUrl];
    facets["/meaning"].meaning = [header];
    facets["/structure"]["constraint-key"] = ["type", "columnIndex"];
    facets["/structure"]["constraint-value"] = ["string", columnIndex];
    writeFacets(pathUrl, facets);
    appendContext({ url: pathUrl, channel: "path-minted", key: "header", value: header });
    return pathUrl;
  }

  function getState() {
    return JSON.parse(JSON.stringify(store)); // deep clone
  }

  function dispatchStateChange(eventDefUrl) {
    const customEvent = new CustomEvent("cgp-state-change", {
      bubbles: true,
      detail: {
        event: eventDefUrl,
        state: getState()
      }
    });
    document.dispatchEvent(customEvent);
  }

  return {
    systemUrl,
    observatronUrl,
    mintEvent,
    mintAnchor,
    mintPath,
    appendContext,
    getState,
    dispatchStateChange
  };
}
