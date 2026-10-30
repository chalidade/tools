# @chalidade/notes

A Markdown notes app for any website: one `<script>` tag, one element.
Checklists, pinning, colours, search and a JSON file backup. **Everything runs
in the visitor's browser**; notes are never sent anywhere.

Notes are written in Markdown (GitHub-flavoured), previewed as HTML that is
sanitized with [DOMPurify](https://github.com/cure53/DOMPurify), and saved
automatically. Checklist boxes stay clickable in the preview and write back
to the Markdown.

This is the [Notes](https://chalidade.github.io/tools/#/notes) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/notes@0/dist/element.js"></script>

<markdown-notes></markdown-notes>
```

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `lang` | `en` or `id`, the UI language | the visitor's browser language |
| `persist` | `false`: keep notes only until the page closes | notes are kept in the browser (IndexedDB) |

### Where the data lives

Notes are kept in IndexedDB (database `tools-notes`, plus a
`tools:notes-welcomed` flag in localStorage) **under your site's origin**, the same storage your own
scripts use, so any script on your pages can read it. Nothing is ever sent
anywhere. Add `persist="false"` for a kiosk, a shared computer, or a demo where
nothing should stay behind.

The **Back up** button saves every note to a `.json` file and **Restore** reads
one back (newer notes win), which is also how notes move to another device.

### Colors

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).
Change its accent colors with CSS variables:

```css
markdown-notes {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/notes
```

```js
import '@chalidade/notes/element' // registers <markdown-notes>
```

In React, `<markdown-notes theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

The Markdown helpers without the UI. `renderMarkdown` pulls in marked and
DOMPurify (about 33 KB gzipped); the rest is plain string code.

```js
import { renderMarkdown, taskCount, toggleTask, continueList } from '@chalidade/notes'

renderMarkdown('**Hi** [docs](https://example.com) [x](javascript:alert(1)) <img src=x onerror=alert(2)>')
// '<p><strong>Hi</strong> <a href="https://example.com" target="_blank" rel="noopener noreferrer">docs</a> <a target="_blank" rel="noopener noreferrer">x</a> <img src="x"></p>'

taskCount('- [x] milk\n- [ ] eggs\n- [ ] bread') // { done: 1, total: 3 }
toggleTask('- [x] milk\n- [ ] eggs', 1)          // '- [x] milk\n- [x] eggs'
continueList('- [ ] milk', 10)                   // { text: '- [ ] milk\n- [ ] ', cursor: 17 }
```

- `renderMarkdown()` needs a browser: with no DOM it throws instead of returning
  unsanitized HTML. Script, event handlers, `javascript:` and `data:` links and
  forms are stripped; links open in a new tab with `rel="noopener noreferrer"`.
  Images are kept, so `![](https://…)` in a note loads that image from its server.
- `wrap()`, `prefixLines()`, `displayTitle()`, `snippet()`, `noteAsMarkdown()`
  and `isNoteList()` (a loose check for a parsed backup file) are exported too;
  see `index.d.ts`.

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
