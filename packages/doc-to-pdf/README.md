# @chalidade/doc-to-pdf

Convert Word documents to PDF on any website: one `<script>` tag, one
element. Drop a `.docx`, check the preview, then either download a PDF right
away (each page as an image) or print to "Save as PDF" for selectable text.
**Everything runs in the visitor's browser**; the document is never uploaded.
The old binary `.doc` format is not supported.

This is the [Word to PDF](https://chalidade.github.io/tools/#/doc-to-pdf) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/doc-to-pdf@0/dist/element.js"></script>

<doc-to-pdf></doc-to-pdf>
```

The element script is about 95 KB gzipped with React included. docx-preview,
html2canvas-pro and jsPDF load only when a document is opened or exported
(about 280 KB gzipped together).

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `lang` | `en` or `id`, the UI language | the visitor's browser language |

### Colors

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).
Change its accent colors with CSS variables:

```css
doc-to-pdf {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/doc-to-pdf
```

```js
import '@chalidade/doc-to-pdf/element' // registers <doc-to-pdf>
```

In React, `<doc-to-pdf theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No React, but it needs a browser (DOM, canvas, print).

```js
import { renderDocx, downloadPdf, printDocx } from '@chalidade/doc-to-pdf'

const body = document.querySelector('#doc')     // must be in the page (it can be off-screen)
const style = document.querySelector('#doc-css')
const sections = await renderDocx(file, body, style) // one <section class="docx"> per page

await downloadPdf(sections, 'letter.pdf', (done, total) => console.log(done, total)) // saves the file
await printDocx(body, style, sections) // the browser's print dialog
```

Sections taller than a page are cut between lines of text, never through one.


## Safety with untrusted files

A `.docx` is a zip of XML that anyone can write by hand, so the renderer is
treated as untrusted:

- Embedded HTML parts ("altChunk") are never rendered.
- Links other than http(s), mailto and in-document anchors are made inert, so
  a `javascript:` link in a file can't run.
- docx-preview writes names from the file into CSS without escaping. Every
  style sheet and inline style is re-read with the browser's own CSS parser and
  any rule that would fetch a remote URL is dropped, so opening a file can't
  tell a server who opened it.
- The print copy runs in a sandboxed iframe with no scripts and a
  Content-Security-Policy that allows only embedded images and fonts.

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
