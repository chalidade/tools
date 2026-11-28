# @chalidade/subtitle

Convert SRT and VTT subtitles, shift and stretch their timing, and merge two files, in the browser.

This is the [Subtitle Editor](https://toowl.my.id/#/subtitle) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged as a custom
element so you can drop it into your own site. Try it there first.

## Use

```html
<script type="module" src="./dist/element.js"></script>

<subtitle-editor></subtitle-editor>
```

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `lang` | `en` or `id`, the UI language | the visitor's browser language |

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).

## License

AGPL-3.0-only. A commercial license (closed source, no AGPL obligations) comes
with the toowl developer kits.
