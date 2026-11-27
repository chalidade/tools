# AI Image Upscaler — Real-ESRGAN 4× / 2× in bulk

Upscale photos, product images, old scans and screenshots **4× or 2×** with Real-ESRGAN (`realesr-general-x4v3`). It restores real detail and edges instead of the blur you get from plain resizing. Give a list of image URLs, get download links back.

## Why use it

- **Bulk**: hundreds of images per run, one dataset row per image with a download link.
- **Real AI super-resolution**: Real-ESRGAN general model, tiled with overlap so there are no seams.
- **2× or 4×**: 2× is the 4× result reduced with a Lanczos filter, crisper than a 2×-trained small model.
- **Transparency kept**: PNG logos and cut-outs keep their alpha channel.
- **PNG, JPG or WebP out**, with a quality setting.
- **No third-party API**: the model runs inside the run; your images are not sent anywhere else.

## Input

```json
{
  "files": [{ "url": "https://example.com/product.jpg" }],
  "scale": "4",
  "format": "png"
}
```

Limits: up to **2 MP input for 4×** (e.g. 1600×1200 → 6400×4800) and **4 MP for 2×**. Larger images get an `error` row and are not charged.

## Output

```json
{
  "url": "https://example.com/product.jpg",
  "name": "product.jpg",
  "downloadUrl": "https://api.apify.com/v2/key-value-stores/…/records/0001-product-4x.png",
  "scale": 4,
  "widthBefore": 400,
  "heightBefore": 300,
  "width": 1600,
  "height": 1200,
  "sizeAfter": 2150331,
  "seconds": 3.1
}
```

## Use cases

- Enlarge small product photos for marketplaces (Amazon, Shopify, Etsy) that require 1000–2000 px images
- Sharpen low-resolution images scraped from the web before using them in a catalogue
- Restore old or compressed photos for print
- Upscale AI-generated images and thumbnails

## Performance

Runs on the CPU. Rough timing with 4 GB memory: a 0.5 MP image at 4× takes a few seconds, 2 MP about 20–40 s. More memory = more CPU cores = faster.

## Pricing

Pay per event: a fee per upscaled image (see the Pricing tab). Failed images are free. Cap spending with "Max cost per run".

## Free browser version

[toowl.my.id/en/upscale-image](https://toowl.my.id/en/upscale-image/) upscales a picture in your browser, free.

Model: Real-ESRGAN `realesr-general-x4v3` by Xintao Wang et al., BSD-3-Clause.

<!-- toowl-footer -->
## Call it from your code

```bash
curl -X POST "https://api.apify.com/v2/acts/toowl~ai-image-upscaler/run-sync-get-dataset-items" \
  -H "Authorization: Bearer $APIFY_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"files":[{"url":"https://example.com/your-file"}]}'
```

The same call works from Python (`apify-client`), JavaScript, Make, Zapier and n8n (Apify app/node or a plain HTTP request).

## Use it from AI agents (MCP)

Add this Actor as a tool to Claude, Cursor, VS Code or any MCP client through Apify's MCP server:

```
https://mcp.apify.com/?actors=toowl/ai-image-upscaler
```

The agent can then pass file URLs and read the results itself.

## More toowl file APIs

PDF to Markdown, OCR, Office to PDF, PDF compressor, PDF merge/split, PDF to image, image converter and compressor, background remover, AI upscaler, image to SVG, QR/barcode reader, video compressor, frame extractor and audio converter. All pay per file, all batch-friendly: [toowl.my.id/en/api](https://toowl.my.id/en/api/).

Questions or a format that fails? Open an issue on the Actor's **Issues** tab.
