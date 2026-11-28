# @chalidade/vocal-remover

Split a song into vocals and instrumental (or drums, bass and other) with an on-device AI model (SCNet), for karaoke and remixes. Nothing is uploaded.

This is the [Vocal Remover](https://toowl.my.id/#/vocal-remover) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged as a custom
element so you can drop it into your own site. Try it there first.

## Use

```html
<script type="module" src="./dist/element.js"></script>

<vocal-remover></vocal-remover>
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
