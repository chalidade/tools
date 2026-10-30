# @chalidade/uuid

Generate UUIDs on any website: one `<script>` tag, one element. Version 4
(random) or version 7 (time-ordered), in bulk, uppercase, without hyphens or
with braces. **Everything runs in the visitor's browser** using
`crypto.getRandomValues`; nothing is sent anywhere.

This is the [UUID Generator](https://chalidade.github.io/tools/#/uuid) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/uuid@0/dist/element.js"></script>

<uuid-generator></uuid-generator>
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
uuid-generator {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/uuid
```

```js
import '@chalidade/uuid/element' // registers <uuid-generator>
```

In React, `<uuid-generator theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI, no React, a few hundred bytes:

```js
import { uuidV4, uuidV7, generate } from '@chalidade/uuid'

uuidV4() // e.g. '8628dc05-caed-4db5-bcf4-4737203216d0'
uuidV7() // e.g. '01a18d93-5a2f-7004-8626-397ea4858114', later ids sort later

generate({ version: 'v7', count: 3, upper: true, hyphens: false, braces: true })
// e.g. ['{01A18D935A2F70059117CE8EE1F27C1D}', …]
```

`uuidV7()` keeps ids made within the same millisecond in order, so they are safe
to use as sortable database keys.

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
