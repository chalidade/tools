# @chalidade/upscale-image

Upscale photos 2x or 4x with an on-device AI model (Real-ESRGAN general x4v3) on WebGPU or WebAssembly. Nothing is uploaded.

This is the [Upscale Image](https://toowl.my.id/#/upscale-image) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged as a custom
element so you can drop it into your own site. Try it there first.

## Use

```html
<script type="module" src="./dist/element.js"></script>

<upscale-image></upscale-image>
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
