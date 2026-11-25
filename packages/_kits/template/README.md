# {{TITLE}}

{{TAGLINE}}

Version {{VERSION}} · {{COUNT}} component(s) · commercial license (see `LICENSE.md`)

Everything runs in your user's browser: files are never uploaded, and there
is no server or API key for you to run. Each component ships two ways:

- **A drop-in web component** (custom element) with its full UI, isolated in
  Shadow DOM so your CSS can't break it. Works in plain HTML, React, Vue,
  Svelte, Angular, WordPress, anything that renders HTML.
- **A headless API**: plain async functions, so you can build your own UI.

Try each one live first:

{{LIVE}}

## What's inside

| Element | What it does | Element module | Headless API |
| --- | --- | --- | --- |
{{TOOL_TABLE}}

```
dist/
  all.js                 registers every element in this kit
  elements/<tool>.js     registers one element (load only what you use)
  index.js               headless API of every tool in this kit
  <tool>.js              headless API of one tool
  chunks/                shared code and WebAssembly, loaded on demand
  *.d.ts                 TypeScript types
examples/
  html/                  every element on one page
  react/                 a Vite + React app
```

## Quick start (plain HTML)

Copy `dist/` into your site (for example to `/vendor/toowl/`), then:

```html
<script type="module" src="/vendor/toowl/elements/{{FIRST_TOOL}}.js"></script>

<{{FIRST_TAG}}></{{FIRST_TAG}}>
```

`dist/` must be served over HTTP(S) (not opened as `file://`), from your own
domain or your CDN. The chunks are loaded relative to the script, so keep the
folder as it is.

To see everything working, run any static server in this folder and open the
example:

```bash
npx serve .            # or: python3 -m http.server
# then open http://localhost:3000/examples/html/
```

## Attributes and colors

Every element takes:

| Attribute | Values | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the OS), `light`, `dark` | `auto` |
| `lang` | `en` or `id` (Indonesian) | the visitor's browser language |

Match your brand with CSS variables on the element:

```css
{{FIRST_TAG}} {
  --sr-brand-1: #2563eb; /* accent (gradient start) */
  --sr-brand-2: #4f46e5; /* accent (gradient end) */
  --radius: 0.5rem;      /* corner radius */
}
```

## Use in a bundler (Vite, webpack, Next.js…)

Copy `dist/` into your project (e.g. `vendor/toowl/`) and import it:

```js
import './vendor/toowl/elements/{{FIRST_TOOL}}.js' // registers <{{FIRST_TAG}}>
```

In React 19, `<{{FIRST_TAG}} theme="light" />` works directly in JSX. With
TypeScript, the element modules come with `.d.ts` files that add the tags to
`HTMLElementTagNameMap`. See `examples/react/`.

In Next.js or any server-rendered framework, import the element module only
in the browser (in a client component's `useEffect`, or with
`next/dynamic` and `ssr: false`), because it defines a custom element.

## Headless API

```js
import * as kit from './vendor/toowl/index.js' // or ./vendor/toowl/<tool>.js
```

Every function, its parameters and return type are documented in the
`.d.ts` files (`dist/types/<tool>.d.ts`), with comments your editor shows on
hover. Heavy libraries load on the first call, not on import.

## Content Security Policy

WebAssembly engines and workers are bundled as `data:`/`blob:` URLs, so no
request goes to any other server. On a page with a strict CSP, allow:

```
script-src 'self' data: 'wasm-unsafe-eval'; worker-src blob:; connect-src 'self' data:;
img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'
```

## Browser support

Current Chrome, Edge, Firefox and Safari (desktop and mobile). Video and audio
tools need WebCodecs (Chrome/Edge 94+, Safari 16.4+, Firefox 130+).

## License

Commercial license: see `LICENSE.md`. In short, use it in unlimited projects
of your own or your clients', closed source, with no AGPL obligations; don't
resell the kit itself. The bundled open-source libraries keep their own
licenses (`THIRD-PARTY-NOTICES.md`, `licenses/`).

## Updates and support

Updates are free: download the latest ZIP from your Gumroad library any time.
Questions or bugs: reply to your Gumroad receipt email.

Made by toowl · https://toowl.my.id
