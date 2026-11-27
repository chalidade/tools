# Image Compressor — TinyPNG / TinyJPG alternative in bulk

Compress JPG, PNG, WebP, AVIF and HEIC images in bulk from URLs. Same idea as TinyPNG: **mozjpeg** for JPG, **palette-quantised PNG**, WebP and AVIF — typically 40–80% smaller with no visible difference. Hit an upload limit with a **target size in KB**, or shrink phone photos to a **max width**.

## Features

- **Keeps the format** by default (HEIC becomes JPG), or converts to JPG, WebP, AVIF, PNG.
- **Target file size**: the best quality that fits under e.g. 200 KB (binary search on quality).
- **Max width/height**: keeps the ratio, never enlarges.
- **Never bigger**: if the original is already smaller, you get the original back.
- **EXIF rotation applied, metadata stripped** (GPS, camera) unless you keep it.
- **Lossless** mode for WebP/AVIF/PNG.
- **Pay per image.** Failed images are free.

## Input

```json
{
  "files": [
    { "url": "https://example.com/hero.png" },
    { "url": "https://example.com/IMG_0042.HEIC" }
  ],
  "quality": 75,
  "maxWidth": 1920
}
```

| Field | Default | Notes |
| --- | --- | --- |
| `files` | — | Image URLs |
| `quality` | 75 | 1–100 (with a target size: the highest tried) |
| `targetSizeKb` | — | e.g. `200` |
| `maxWidth`, `maxHeight` | — | px |
| `format` | `same` | `same`, `jpg`, `webp`, `avif`, `png` |
| `lossless` | false | |
| `keepMetadata` | false | |
| `maxFileSizeMb` | 50 | |

## Output

```json
{
  "url": "https://example.com/hero.png",
  "name": "hero.png",
  "downloadUrl": "https://api.apify.com/v2/key-value-stores/…/records/0001-hero.png",
  "inputFormat": "png",
  "outputFormat": "png",
  "quality": 75,
  "width": 1920,
  "height": 1080,
  "sizeBefore": 2484211,
  "sizeAfter": 512408,
  "savedPercent": 79.4
}
```

Need format conversion and resize modes (cover, contain, padding)? See the [Image Converter & Resizer](https://apify.com/toowl/image-converter).

## Pricing

Pay per event: one `image-compressed` per image. Failed images are free.

## Free browser version

[toowl.my.id/en/compress-image](https://toowl.my.id/en/compress-image/) compresses images in your browser, free, nothing uploaded.
