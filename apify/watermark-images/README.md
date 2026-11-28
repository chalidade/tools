# Bulk Image Watermark — text or logo, tiled, JPG/PNG/WebP

Protect hundreds of product photos in one go. Put your **logo** or a line of **text** (`© My Shop`, `@myshop`) in a corner, the centre, or as a **tiled diagonal pattern** over the whole image, then get every photo back in one ZIP, ready for Shopee, Tokopedia, Etsy, Amazon, Instagram or your own store.

## What you get

- **Logo or text** watermark. Text is bold with a soft outline, so it reads on light and dark photos
- **9 positions** plus a **tiled pattern** (angle and spacing adjustable), which is much harder to crop out
- **Size** (% of the photo width), **opacity**, **edge margin**
- **Resize** to a max side (e.g. 2048 px) in the same pass
- **Phone photos come out upright** (EXIF rotation applied)
- **Privacy**: camera data and GPS location are removed unless you keep them
- **JPG, PNG, WebP** output (or same as input), quality adjustable
- **One ZIP** with all images, plus a dataset row (with preview) per image

## Input

```json
{
  "files": [
    { "url": "https://example.com/products/shoe-1.jpg" },
    { "url": "https://example.com/products/shoe-2.jpg" }
  ],
  "logoUrl": "https://example.com/logo.png",
  "position": "br",
  "sizePercent": 20,
  "opacity": 70,
  "maxSide": 2048
}
```

Text instead of a logo, as a tiled pattern:

```json
{
  "files": [{ "url": "https://example.com/photo.jpg" }],
  "text": "© My Shop",
  "position": "tile",
  "opacity": 35,
  "angle": -30
}
```

## Output

```json
{
  "name": "shoe-1.jpg",
  "width": 2048,
  "height": 2048,
  "format": "jpg",
  "sizeKb": 512.3,
  "imageUrl": "https://api.apify.com/v2/key-value-stores/…/records/0001-shoe-1.jpg"
}
```

Plus `watermarked.zip` and a `SUMMARY` record in the run's key-value store.

## Pricing

Pay per event: one `image-watermarked` per image. Images that fail (broken link, not an image) are free. Cap spending with "Max cost per run".

## Free browser version

A handful of photos? [toowl.my.id/en/watermark-foto](https://toowl.my.id/en/watermark-foto/) watermarks them in your browser for free, without uploading anything. Same layout engine.

<!-- toowl-footer -->
## Call it from your code

```bash
curl -X POST "https://api.apify.com/v2/acts/toowl~watermark-images/run-sync-get-dataset-items" \
  -H "Authorization: Bearer $APIFY_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"files":[{"url":"https://example.com/photo.jpg"}],"text":"© My Shop","position":"tile"}'
```

The same call works from Python (`apify-client`), JavaScript, Make, Zapier and n8n (Apify app/node or a plain HTTP request).

## Use it from AI agents (MCP)

Add this Actor as a tool to Claude, Cursor, VS Code or any MCP client through Apify's MCP server:

```
https://mcp.apify.com/?actors=toowl/watermark-images
```

The agent can then pass file URLs and read the results itself.

## More toowl file APIs

Speech to text & subtitles, AI vocal remover, text to speech, AI object remover, PDF to Markdown, PDF to Word & Excel, HTML/URL to PDF, OCR, Office to PDF, PDF compressor, PDF merge/split, PDF password protect, PDF to image, image to PDF, bulk watermark, image converter and compressor, background remover, AI upscaler, image to SVG, QR code and barcode generators, QR/barcode reader, favicon generator, video compressor, frame extractor and audio converter. All pay per file, all batch-friendly: [toowl.my.id/en/api](https://toowl.my.id/en/api/).

Questions or a format that fails? Open an issue on the Actor's **Issues** tab.
