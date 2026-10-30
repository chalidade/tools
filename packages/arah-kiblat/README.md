# @chalidade/arah-kiblat

The Qibla direction on any website: one `<script>` tag, one element. Shows the
bearing to the Kaaba from a city or the visitor's location, and on a phone
turns into a live compass. **Everything runs in the visitor's browser**;
nothing is sent anywhere.

The *Qibla* is the direction of the Kaaba in Mecca, which Muslims face in
prayer. The bearing is the great-circle direction measured from true north.
A phone compass may report magnetic north and needs calibration, so the element
warns when the sensor reports poor accuracy and suggests checking a local
mosque's direction.

This is the [Qibla Direction](https://chalidade.github.io/tools/#/arah-kiblat) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/arah-kiblat@0/dist/element.js"></script>

<qibla-direction></qibla-direction>
```

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `lang` | `en` or `id`, the UI language | the visitor's browser language |

### Location

**Use my location** asks the browser for the visitor's position only when they
click it. The permission prompt names *your* site, since the element runs on
your page. The position is used for the calculation and kept in memory only:
it is not stored and not sent anywhere. Without it, the visitor picks one of
the bundled Indonesian cities (Jakarta is the default).

### Compass

**Turn on phone compass** reads the device orientation sensor only after that
click (iOS asks for permission). It works on phones and tablets over HTTPS;
on a computer the element shows the bearing only.

### Colors

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).
Change its accent colors with CSS variables:

```css
qibla-direction {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/arah-kiblat
```

```js
import '@chalidade/arah-kiblat/element' // registers <qibla-direction>
```

In React, `<qibla-direction theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI, no React, under 0.5 KB gzipped:

```js
import { qibla } from '@chalidade/arah-kiblat'

qibla(-6.2088, 106.8456) // Jakarta
// { bearing: 295.15173626224407, km: 7920.1268348390495 }

qibla(51.5074, -0.1278)  // London
// { bearing: 118.98721949633443, km: 4793.775140894188 }
```

`bearing` is degrees clockwise from true north, `km` the great-circle distance.
`KAABA` holds the coordinates used (21.4225° N, 39.8262° E).

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
