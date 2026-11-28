# AI Object Remover — erase people, text, logos and blemishes

Remove unwanted objects from photos in bulk with the **MI-GAN** inpainting model: tourists in the background, text, date stamps, logos you have the rights to remove, power lines, stains, blemishes. Mark what to remove with a **mask image** or **boxes**; the model fills it in with matching background.

## Why use it

- **Mask or boxes**: a black-and-white mask (white = remove; a transparent PNG with opaque strokes works too), or rectangles in pixels or percent.
- **One mask for many photos**: remove the same corner logo or date stamp from a whole folder with one `boxes` setting in percent.
- **Full resolution kept**: only the marked areas (plus a soft edge) change; each area is filled in its own 512 px window with enough context around it.
- **JPG, PNG, WebP** out; one ZIP of all results.
- **No third-party API**: the model runs inside the Actor.
- **Pay per image.** Failed images are free.

## Input

```json
{
  "images": [
    {
      "imageUrl": "https://example.com/beach.jpg",
      "boxes": [{ "x": 690, "y": 410, "width": 180, "height": 320 }]
    },
    { "imageUrl": "https://example.com/product.jpg", "maskUrl": "https://example.com/product-mask.png" }
  ]
}
```

Same corner on every photo (bottom-right 15% × 10%):

```json
{
  "images": ["https://example.com/1.jpg", "https://example.com/2.jpg"],
  "boxes": [{ "x": 85, "y": 90, "width": 15, "height": 10 }],
  "boxUnit": "percent"
}
```

## Output

```json
{
  "imageUrl": "https://example.com/beach.jpg",
  "name": "beach",
  "width": 1600,
  "height": 1000,
  "areas": 1,
  "maskedPercent": 3.6,
  "downloadUrl": "https://api.apify.com/v2/key-value-stores/…/records/0001-beach.jpg"
}
```

## Tips

- Mark a little beyond the object, including its shadow.
- Works best on objects in front of natural, repetitive backgrounds (sky, grass, walls, sand). Large areas over complex scenes are guessed and may look soft.
- Masks covering more than 60% of a photo are rejected.

## Pricing

Pay per event: one event per processed image. Cap any run with "Max cost per run".

## Rights

Only edit images you own or have permission to edit; don't remove watermarks or credits from other people's work.

## Free browser version

Paint over objects by hand at [toowl.my.id/tools/remove-object](https://toowl.my.id/tools/remove-object/) — free, in your browser.

<!-- toowl-footer -->
## Call it from your code

```bash
curl -X POST "https://api.apify.com/v2/acts/toowl~ai-object-remover/run-sync-get-dataset-items" \
  -H "Authorization: Bearer $APIFY_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"images":[{"imageUrl":"https://example.com/photo.jpg","boxes":[{"x":100,"y":80,"width":200,"height":150}]}]}'
```

The same call works from Python (`apify-client`), JavaScript, Make, Zapier and n8n (Apify app/node or a plain HTTP request).

## Use it from AI agents (MCP)

Add this Actor as a tool to Claude, Cursor, VS Code or any MCP client through Apify's MCP server:

```
https://mcp.apify.com/?actors=toowl/ai-object-remover
```

The agent can then pass file URLs and read the results itself.

## More toowl file APIs

Speech to text & subtitles, AI vocal remover, text to speech, AI object remover, PDF to Markdown, PDF to Word & Excel, HTML/URL to PDF, OCR, Office to PDF, PDF compressor, PDF merge/split, PDF password protect, PDF to image, image to PDF, bulk watermark, image converter and compressor, background remover, AI upscaler, image to SVG, QR code and barcode generators, QR/barcode reader, favicon generator, video compressor, frame extractor and audio converter. All pay per file, all batch-friendly: [toowl.my.id/en/api](https://toowl.my.id/en/api/).

Questions or a format that fails? Open an issue on the Actor's **Issues** tab.
