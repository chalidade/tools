# @chalidade/word-counter

A word counter for any website: one `<script>` tag, one element. Counts words,
characters, sentences and paragraphs as you type, estimates reading and
speaking time, and checks the text against X, Instagram, TikTok, LinkedIn, SMS
and SEO limits. **Everything runs in the visitor's browser**; the text is never sent anywhere.

This is the [Word Counter](https://chalidade.github.io/tools/#/word-counter) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/word-counter@0/dist/element.js"></script>

<word-counter></word-counter>
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
word-counter {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/word-counter
```

```js
import '@chalidade/word-counter/element' // registers <word-counter>
```

In React, `<word-counter theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI, no React, under 1 KB gzipped:

```js
import { analyze, LIMITS } from '@chalidade/word-counter'

const stats = analyze(text)
// { words, chars, charsNoSpaces, sentences, paragraphs, lines, readMinutes, speakMinutes }

const tooLong = LIMITS.filter((l) => stats.chars > l.max).map((l) => l.name)
```

- Characters are counted the way people see them: an emoji or an accented
  letter is one character (`graphemeLength()`).
- `countWords()` keeps `don't`, `kupu-kupu` and `3.5` as one word each, in any script.
- Reading time uses 230 words per minute (`READ_WPM`), speaking time 130 (`SPEAK_WPM`).

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
