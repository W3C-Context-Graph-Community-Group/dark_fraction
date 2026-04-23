# Event Bus

A WebSocket-based event bus where events are URLs. Clients connect, subscribe to URL patterns, and emit URL events as pure signals.

## Starting the server

```bash
node lib/event-bus/server.js
```

Listens on `ws://localhost:8080` by default. Set a custom port with the `BUS_PORT` environment variable:

```bash
BUS_PORT=9000 node lib/event-bus/server.js
```

Or use the npm script:

```bash
npm run bus
```

## Client usage (browser)

Import the client module and create a bus instance:

```html
<script type="module">
  import { EventBus } from '/lib/event-bus/client.js';

  const bus = new EventBus('ws://localhost:8080');

  // Subscribe to an event
  bus.on('/foo', (msg) => {
    console.log('received /foo from client', msg.from);
  });

  // Emit an event
  bus.emit('/foo');

  // Unsubscribe from an event
  bus.off('/foo');
</script>
```

## API

### `new EventBus(url?)`

Creates a client and connects to the bus server. Defaults to `ws://localhost:8080`.

### `bus.on(url, callback)`

Subscribe to events at `url`. The callback receives a message object:

```js
{ "event": "/foo", "from": "3" }
```

- `event` — the URL that was emitted
- `from` — the client ID of the emitter

Multiple callbacks can be registered for the same URL.

### `bus.off(url, callback?)`

Remove a specific callback for `url`. If no callback is provided, removes all listeners for that URL.

### `bus.emit(url)`

Emit an event. Every other client subscribed to `url` will receive it. The emitter does **not** receive its own event.

## Protocol

Messages are JSON over WebSocket.

**Client to server:**

| Action | Message |
|--------|---------|
| Subscribe | `{ "action": "subscribe", "url": "/foo" }` |
| Unsubscribe | `{ "action": "unsubscribe", "url": "/foo" }` |
| Emit | `{ "action": "emit", "url": "/foo" }` |

**Server to client:**

| Event | Message |
|-------|---------|
| Event received | `{ "event": "/foo", "from": "2" }` |

## Behavior

- Events are bare URL strings — no payloads. Use the URL itself to carry meaning (e.g. `/facet/meaning/registered`, `/dataset/prices.csv/loaded`).
- The emitter never receives its own event (no echo).
- Subscriptions are exact match on the URL string.
- When a client disconnects, all its subscriptions are cleaned up automatically.
- The client auto-reconnects on disconnect with exponential backoff (1s, 2s, 4s, ... up to 30s). Subscriptions are re-sent on reconnect.

## Example: two browser tabs

**Tab 1** — subscribe:

```js
const bus = new EventBus();
bus.on('/calc/updated', (msg) => {
  console.log('calculator was updated by client', msg.from);
});
```

**Tab 2** — emit:

```js
const bus = new EventBus();
bus.emit('/calc/updated');
```

Tab 1 logs: `calculator was updated by client 2`

## Files

| File | Description |
|------|-------------|
| `lib/event-bus/server.js` | WebSocket server (~50 lines, requires `ws` package) |
| `lib/event-bus/client.js` | Browser/Node client (~65 lines, no dependencies) |
