# @chalidade/tasbih

A big tap counter for dhikr on any website: one `<script>` tag, one element.
Targets of 33, 99, a custom number or none, a vibration when a round is done,
keyboard shortcuts and a history of rounds. **Everything runs in the visitor's
browser**; nothing is sent anywhere.

A *tasbih* (prayer beads) is what many Muslims use to count *dhikr*, short
phrases of remembrance repeated 33 or 99 times, for example after prayer. This
element replaces the beads with one large button, for Islamic sites, mosque or
study-group pages and Ramadan pages. It is just a counter: it does not show
or suggest any recitation.

This is the [Digital Tasbih](https://chalidade.github.io/tools/#/tasbih) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/tasbih@0/dist/element.js"></script>

<tasbih-counter></tasbih-counter>
```

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `lang` | `en` or `id`, the UI language | the visitor's browser language |
| `persist` | `false`: keep nothing in storage | the count and history are kept (localStorage) |

### Where the data lives

The count, target, all-time total and the last 30 rounds are kept in
localStorage (key `tools:tasbih`) **under your site's origin**, the same storage your own
scripts use, so any script on your pages can read it. Nothing is ever sent
anywhere. Add `persist="false"` for a kiosk, a shared computer, or a demo where
nothing should stay behind.

### Keyboard

Space or Enter counts and Backspace undoes one, while focus is inside the
element (tap the counter once). Embedded on your page, it never takes these
keys from the rest of the page.

### Colors

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).
Change its accent colors with CSS variables:

```css
tasbih-counter {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/tasbih
```

```js
import '@chalidade/tasbih' // registers <tasbih-counter>
```

In React, `<tasbih-counter theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

None: a counter has no logic worth exporting. `import '@chalidade/tasbih'`
registers the element, the same as `@chalidade/tasbih/element`.

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
