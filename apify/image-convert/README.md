# Image Converter & Resizer — HEIC, AVIF, WebP, PNG, JPG in bulk

Convert, resize and compress images in bulk from URLs. Turn iPhone **HEIC photos into JPG**, product photos into **WebP or AVIF** for a faster website, or shrink PNGs TinyPNG-style — hundreds at a time.

## Formats

- **In**: HEIC / HEIF (iPhone, Samsung), AVIF, WebP, PNG, JPG, TIFF, GIF (incl. animated), SVG
- **Out**: WebP, JPG, PNG, AVIF, TIFF, GIF

## Features

- **Resize** to a max width/height, with `inside` (keep ratio), `cover` (crop to fill), `contain` (pad), `fill` or `outside`. Never upscales unless you allow it.
- **Compress**: mozjpeg for JPG, palette-quantized PNG (like TinyPNG) when quality < 100, WebP/AVIF lossy or lossless.
- **EXIF rotation applied**, so photos come out the right way up.
- **Privacy by default**: EXIF, GPS and camera metadata are stripped (turn on `keepMetadata` to keep them).
- **Transparency** is flattened onto your background colour when converting to JPG.
- **Pay only for images that worked.**

## Input

```json
{
  "files": [
    { "url": "https://example.com/IMG_0001.HEIC" },
    { "url": "https://example.com/banner.png" }
  ],
  "format": "webp",
  "quality": 80,
  "width": 1600
}
```

| Field | Default | Notes |
| --- | --- | --- |
| `files` | — | Image URLs |
| `format` | `webp` | `webp`, `jpg`, `png`, `avif`, `tiff`, `gif` |
| `quality` | 80 | 1–100 |
| `width`, `height` | — | Max box; leave empty to keep size |
| `fit` | `inside` | `inside`, `cover`, `contain`, `fill`, `outside` |
| `allowUpscale` | false | |
| `background` | `#ffffff` | JPG flattening and `contain` padding |
| `lossless` | false | WebP/AVIF lossless, full-colour PNG, LZW TIFF |
| `keepMetadata` | false | Keep EXIF/GPS/ICC |
| `maxFileSizeMb` | 50 | |

## Output

Converted files are stored in the run's key-value store; the dataset has one row per image:

```json
{
  "url": "https://example.com/IMG_0001.HEIC",
  "name": "IMG_0001.HEIC",
  "downloadUrl": "https://api.apify.com/v2/key-value-stores/…/records/0001-IMG_0001.webp",
  "inputFormat": "heif",
  "outputFormat": "webp",
  "width": 1600,
  "height": 1198,
  "sizeBefore": 2994394,
  "sizeAfter": 233104,
  "savedPercent": 92.2
}
```

## Integrations

Run it from the Apify API, Zapier, Make, n8n or a webhook: e.g. convert every new Shopify/WooCommerce product image to WebP, or every HEIC upload in a Drive folder to JPG.

## Pricing

Pay per event: a small fee per converted image (see the Pricing tab). Failed images are free. Cap spending with "Max cost per run".

## Free browser version

Converting a few files by hand? Use [toowl.my.id/en/convert-image](https://toowl.my.id/en/convert-image/) — free, runs in your browser.

<!-- toowl-footer -->
## Call it from your code

```bash
curl -X POST "https://api.apify.com/v2/acts/toowl~image-converter/run-sync-get-dataset-items" \
  -H "Authorization: Bearer $APIFY_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"files":[{"url":"https://example.com/your-file"}]}'
```

The same call works from Python (`apify-client`), JavaScript, Make, Zapier and n8n (Apify app/node or a plain HTTP request).

## Use it from AI agents (MCP)

Add this Actor as a tool to Claude, Cursor, VS Code or any MCP client through Apify's MCP server:

```
https://mcp.apify.com/?actors=toowl/image-converter
```

The agent can then pass file URLs and read the results itself.

## More toowl file APIs

PDF to Markdown, OCR, Office to PDF, PDF compressor, PDF merge/split, PDF to image, image converter and compressor, background remover, AI upscaler, image to SVG, QR/barcode reader, video compressor, frame extractor and audio converter. All pay per file, all batch-friendly: [toowl.my.id/en/api](https://toowl.my.id/en/api/).

Questions or a format that fails? Open an issue on the Actor's **Issues** tab.
