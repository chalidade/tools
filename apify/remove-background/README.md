# AI Background Remover — transparent PNG in bulk

Remove the background from images in bulk with the **IS-Net** AI model (DIS, general use): products, people, animals, cars. Get a **transparent PNG/WebP**, a **white background for marketplaces** (Amazon, Shopee, Tokopedia, eBay), any colour, the **mask** alone, or the subject **cropped** with padding.

The model runs inside the Actor: no remove.bg API, no per-image fee to a third party.

## Features

- **Transparent PNG or WebP**, or JPG on a background colour.
- **Mask only** (white subject on black) for your own compositing.
- **Crop to subject** with padding: consistent product shots.
- **Soft edges** for hair and fur, **hard edges** for products and logos.
- **Max width** to shrink huge photos first.
- **Pay per image.** Failed images are free.

## Input

```json
{
  "files": [
    { "url": "https://example.com/products/shoe-01.jpg" },
    { "url": "https://example.com/products/shoe-02.jpg" }
  ],
  "format": "jpg",
  "background": "#ffffff",
  "cropToSubject": true,
  "padding": 40
}
```

| Field | Default | Notes |
| --- | --- | --- |
| `files` | — | Image URLs (JPG, PNG, WebP, AVIF, TIFF) |
| `output` | `cutout` | `cutout`, `mask` |
| `format` | `png` | `png`, `webp`, `jpg` |
| `background` | transparent | Any CSS colour |
| `cropToSubject` | false | |
| `padding` | 0 | px around the crop |
| `hardEdges` | false | |
| `maxWidth` | — | px |
| `quality` | 90 | WebP/JPG |
| `maxFileSizeMb` | 30 | |

## Output

```json
{
  "url": "https://example.com/products/shoe-01.jpg",
  "name": "shoe-01.jpg",
  "downloadUrl": "https://api.apify.com/v2/key-value-stores/…/records/0001-shoe-01-nobg.jpg",
  "width": 1180,
  "height": 864,
  "subjectPercent": 38.2,
  "sizeAfter": 182044,
  "seconds": 6.1
}
```

## Pricing

Pay per event: one `background-removed` per image. Failed images are free.

## Model and licence

IS-Net general-use (Qin et al., "Highly Accurate Dichotomous Image Segmentation", Apache-2.0), run with ONNX Runtime on the CPU.

## Free browser version

[toowl.my.id/en/remove-background](https://toowl.my.id/en/remove-background/) removes backgrounds in your browser, free, with brush and lasso touch-ups.
