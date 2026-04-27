export class ConnectionTracker {
  constructor(observatronAddress) {
    this._address = observatronAddress;
    this._connections = [];
  }

  get address() { return this._address; }

  get state() {
    return {
      observatronAddress: this._address,
      connections: this._connections,
    };
  }

  connect(spikeA, spikeB, wireTypes) {
    this.disconnect(spikeA, spikeB);
    this._connections.push({ spikeA, spikeB, wireTypes: [...wireTypes] });
  }

  disconnect(spikeA, spikeB) {
    this._connections = this._connections.filter(
      c => !(c.spikeA === spikeA && c.spikeB === spikeB),
    );
  }

  clear() {
    this._connections = [];
  }

  getConnection(spikeA, spikeB) {
    return this._connections.find(
      c => c.spikeA === spikeA && c.spikeB === spikeB,
    ) ?? null;
  }

  toJSON() {
    return JSON.parse(JSON.stringify(this.state));
  }
}
