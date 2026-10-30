# @chalidade/encode-decode

Encode and decode text on any website: one `<script>` tag, one element.
Base64 (standard or URL-safe, UTF-8 and emoji included), URL percent-encoding,
HTML entities, and JWT reading (header, payload and the iat/nbf/exp dates).
**Everything runs in the visitor's browser**; no text or token is sent
anywhere. JWT signatures are not verified, and the tool says so.

This is the [Encode / Decode](https://chalidade.github.io/tools/#/encode-decode) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/encode-decode@0/dist/element.js"></script>

<encode-decode></encode-decode>
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
encode-decode {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/encode-decode
```

```js
import '@chalidade/encode-decode/element' // registers <encode-decode>
```

In React, `<encode-decode theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI, no React, runs in Node too.

```js
import { base64Encode, base64Decode, urlEncode, urlDecode, htmlEncode, htmlDecode, decodeJwt } from '@chalidade/encode-decode'

base64Encode('Halo, dunia! 👋')       // 'SGFsbywgZHVuaWEhIPCfkYs='
base64Encode('Halo, dunia! 👋', true) // 'SGFsbywgZHVuaWEhIPCfkYs' (URL-safe)
base64Decode('SGFsbywgZHVuaWEhIPCfkYs') // 'Halo, dunia! 👋'

urlEncode('a b&c=d/é')                         // 'a%20b%26c%3Dd%2F%C3%A9'
urlEncode('https://x.id/a b?q=1&r=é', true)    // 'https://x.id/a%20b?q=1&r=%C3%A9'
urlDecode('a+b%26c')                           // 'a b&c'

htmlEncode('<a href="x">Tom & Jerry</a>') // '&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&lt;/a&gt;'
htmlDecode('&lt;b&gt; &copy; 2026 &#x1F600; &unknown;') // '<b> © 2026 😀 &unknown;'

const jwt = decodeJwt('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c')
jwt.header  // { alg: 'HS256', typ: 'JWT' }
jwt.payload // { sub: '1234567890', name: 'John Doe', iat: 1516239022 }
jwt.times   // [{ name: 'iat', date: 2018-01-18T01:30:22.000Z }]
```

Invalid input throws an `Error` with a readable message
(`base64Decode('***')` → `'Not valid Base64.'`), in the visitor's browser
language. `decodeJwt` does **not** check the signature.


## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
