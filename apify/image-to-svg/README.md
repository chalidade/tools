# Image to SVG Vectorizer (PNG, JPG to SVG, Bulk)

Convert **PNG, JPG and WebP images to SVG vectors** in bulk from URLs. Logos, icons, illustrations, signatures and line art become clean, scalable paths you can resize to any size, recolour, edit in Figma, Illustrator or Inkscape, or send to a **Cricut, Silhouette or laser cutter**.

Powered by **VTracer**, an open-source tracer that handles full-colour images (not just black and white like potrace).

## Use cases

- Rescue a **low-resolution logo** as a crisp SVG for print and the web.
- Turn hand-drawn sketches, stamps and **signatures** into vector shapes.
- **Cut files** for Cricut / Silhouette / laser engraving (black-and-white mode, light parts with `invert`).
- Bulk-convert an icon set or clip-art library to SVG.

## Features

- **Colour** (stacked colour layers) or **black and white** (one solid shape) mode.
- Control the look: colour detail, layer merge, speck removal, smooth curves / polygons / pixels, corner angle.
- Black and white: threshold, invert, **shape colour**.
- `viewBox` added, so the SVG scales cleanly.
- Large images are scaled down first (`maxSize`) so tracing stays fast.
- **Pay per image.** Failed images are free.

## Input

```json
{
  "files": [{ "url": "https://example.com/logo.png" }],
  "mode": "color",
  "colorDetail": 5,
  "filterSpeckle": 4
}
```

| Field | Default | Notes |
| --- | --- | --- |
| `files` | — | Image URLs (PNG, JPG, WebP, AVIF, GIF, TIFF) |
| `mode` | `color` | `color`, `bw` |
| `colorDetail` | 5 | 1–7 |
| `layerDifference` | 16 | 0–255 |
| `filterSpeckle` | 4 | px |
| `curveMode` | `spline` | `spline`, `polygon`, `pixel` |
| `cornerThreshold` | 60 | degrees |
| `threshold` | 128 | Black and white |
| `invert` | false | Black and white |
| `color` | `#000000` | Black and white shape colour |
| `background` | — | Hex colour behind transparent pixels (colour mode) |
| `maxSize` | 2000 | px |
| `timeoutSecs` | 120 | Per image |

Tip: for photos, lower `colorDetail` (3–4) and raise `filterSpeckle` (8–12) to get a poster-like result with far fewer paths.

## Output

```json
{
  "url": "https://example.com/logo.png",
  "name": "logo.png",
  "downloadUrl": "https://api.apify.com/v2/key-value-stores/…/records/0001-logo.svg",
  "width": 512,
  "height": 512,
  "shapes": 14,
  "sizeBefore": 22870,
  "sizeAfter": 13429
}
```

## Pricing

Pay per event: one `image-vectorized` per image. Failed images are free.

## Free browser version

[toowl.my.id/en/image-to-svg](https://toowl.my.id/en/image-to-svg/) vectorizes images in your browser with a live preview, free, nothing uploaded.
