# Sidebar Navigation Component

`/sidebar.js` — a self-contained, reusable hamburger sidebar used across all sub-pages.

## Quick Start

Add one `<script>` tag as the **first child of `<body>`**:

```html
<body>
  <script src="../sidebar.js" data-active="calculator"></script>
  <!-- rest of page content -->
</body>
```

This single line injects all sidebar CSS, HTML (hamburger button, backdrop, nav links), and event listeners. No other sidebar code is needed in your page.

## Attributes

| Attribute | Required | Default | Description |
|-----------|----------|---------|-------------|
| `data-active` | Yes | `""` | Which nav link to highlight. One of: `home`, `calculator`, `observatrons`, `ui-bindings`, `demo` |
| `data-accent` | No | `#A78BFA` (purple) | Hex color for the active link highlight. Only override if the page uses a non-purple accent |

## Examples

Default purple accent:
```html
<script src="../sidebar.js" data-active="observatrons"></script>
```

Custom amber accent (used by the Demo page):
```html
<script src="../sidebar.js" data-active="demo" data-accent="#F59E0B"></script>
```

## How It Works

When the script runs, it:

1. Reads `data-active` and `data-accent` from `document.currentScript`
2. Appends a `<style>` element to `<head>` with all sidebar CSS
3. Inserts the sidebar HTML at the beginning of `<body>` via `insertAdjacentHTML('afterbegin')`
4. Binds click/escape/backdrop event listeners for open/close

The script is synchronous and self-contained — no dependencies, no build step.

## Navigation Links

The nav links are defined in the `links` array inside `sidebar.js` (line 60). To add or remove a nav entry, edit this array:

```js
var links = [
  { id: 'home',         label: 'Home',         href: '../' },
  { id: '_hr' },  // horizontal rule separator
  { id: 'calculator',   label: 'Calculator',   href: '../calculator/' },
  { id: 'observatrons', label: 'Observatrons', href: '../observatrons/' },
  { id: 'ui-bindings',  label: 'UI Bindings',  href: '../ui-bindings/' },
  { id: 'demo',         label: 'Demo',         href: '../demo/' }
];
```

- The `id` is matched against `data-active` to set the `.active` class
- Use `{ id: '_hr' }` to insert an `<hr>` separator
- All `href` values use `../` because every sub-page is one directory level deep

## Adding a New Page

1. Create a new directory (e.g., `/my-page/index.html`)
2. Add the script tag to the new page:
   ```html
   <script src="../sidebar.js" data-active="my-page"></script>
   ```
3. Add the nav entry in `sidebar.js`:
   ```js
   { id: 'my-page', label: 'My Page', href: '../my-page/' }
   ```
4. Add a card on the root `index.html` landing page if desired

## Pages Using This Component

- `calculator/index.html` — `data-active="calculator"`
- `calculator/1.html` — `data-active="calculator"`
- `observatrons/index.html` — `data-active="observatrons"`
- `ui-bindings/index.html` — `data-active="ui-bindings"`
- `demo/index.html` — `data-active="demo"` `data-accent="#F59E0B"`

## Pages NOT Using This Component

- `index.html` (root landing page) — no sidebar, serves as the home/card grid
- `observatrons/sequencer.html` — has its own separate control panel sidebar for 3D scene controls

## DOM Elements Injected

The script creates these elements (available after the script runs):

| ID | Element | Purpose |
|----|---------|---------|
| `sidebarToggle` | `<button>` | Hamburger button (fixed, top-left) |
| `sidebarBackdrop` | `<div>` | Translucent overlay when sidebar is open |
| `sidebarNav` | `<nav>` | The slide-out navigation panel |

## CSS Classes

| Class | Applied to | Trigger |
|-------|-----------|---------|
| `.open` | hamburger, backdrop, nav | Added/removed when sidebar toggles |
| `.active` | nav `<a>` | Set automatically based on `data-active` |

## Constraints

- The script must be placed **inside `<body>`**, not in `<head>` (it needs `document.body` to exist)
- Do **not** use `defer` or `async` — `document.currentScript` is null in deferred scripts
- All pages must be exactly one directory level deep from root for the `../` links to resolve correctly
