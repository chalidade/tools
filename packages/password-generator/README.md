# @chalidade/password-generator

A password generator for any website: one `<script>` tag, one element.
Random passwords or English/Indonesian passphrases, plus a strength check with
an estimated time to crack. **Everything runs in the visitor's browser** using
`crypto.getRandomValues`; no password ever leaves the page.

This is the [Password Generator](https://chalidade.github.io/tools/#/password-generator) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/password-generator@0/dist/element.js"></script>

<password-generator></password-generator>
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
password-generator {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/password-generator
```

```js
import '@chalidade/password-generator/element' // registers <password-generator>
```

In React, `<password-generator theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI, no React, about 3 KB gzipped including both word lists:

```js
import {
  generatePassword, generatePassphrase, WORDS_EN,
  estimateStrength, secondsToGuess, level,
} from '@chalidade/password-generator'

generatePassword({ length: 16, lower: true, upper: true, digits: true, symbols: true, noAmbiguous: true })
// e.g. ')Pe2),utb)eVr3FV'

generatePassphrase(WORDS_EN, { words: 4, separator: '-', capitalize: true, number: true })
// e.g. 'Arrow-Nectar-Butter-Yarn7'

const bits = estimateStrength('Summer2024!') // about 65 bits
level(bits)                                   // 2: 0 (very weak) … 4 (very strong)
secondsToGuess(bits)                          // average seconds at 10^10 guesses/s
```

- `passwordEntropy(options)` / `passphraseEntropy(listSize, options)` give the
  entropy of what the generator produces.
- `estimateStrength()` penalises repeated characters, runs like `abcd` / `4321`
  and common words (`password`, `qwerty`, …).
- `WORDS_ID` is the Indonesian word list.

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
