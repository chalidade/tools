# @chalidade/link-wa

Make WhatsApp chat links on any website: one `<script>` tag, one element.
Type a phone number in any common format (`0812-…`, `+62 812 …`) and an
optional message, and get a copy-ready `wa.me` link, a "Chat now" button and
the link as a QR code (PNG or SVG). **Everything runs in the visitor's
browser**; the number and message are not sent to any server.

This is the [WhatsApp Link](https://chalidade.github.io/tools/#/link-wa) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/link-wa@0/dist/element.js"></script>

<link-wa></link-wa>
```

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `lang` | `en` or `id`, the UI language | the visitor's browser language |

### Colors

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).
Change its accent colors with CSS variables:

```css
link-wa {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/link-wa
```

```js
import '@chalidade/link-wa/element' // registers <link-wa>
```

In React, `<link-wa theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI, no React, runs in Node too.

```js
import { buildWhatsApp, internationalPhone } from '@chalidade/link-wa'

internationalPhone('0812-3456-7890')    // '6281234567890' (a leading 0 is read as Indonesian, +62)
internationalPhone('+62 812 3456 7890') // '6281234567890'
internationalPhone('+1 (415) 555-0100') // '14155550100'

buildWhatsApp({ to: '0812-3456-7890', subject: '', body: 'Halo, saya mau pesan 2 porsi' })
// 'https://wa.me/6281234567890?text=Halo%2C%20saya%20mau%20pesan%202%20porsi'
```


## Storage

The number is kept in the host page's `localStorage` (key `link-wa:number`)
only while the visitor ticks "Remember this number on this device"; unticking
it removes the key.

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
