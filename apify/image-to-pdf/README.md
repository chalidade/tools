# Image to PDF Converter — JPG, PNG, WebP to PDF in bulk

Got a pile of photos, receipts or phone scans? Give this Actor the image URLs and get back **one tidy PDF** with a page per image, or **one PDF per image**, whichever you need. Pages are A4, Letter, Legal, A5 or exactly the image size, turned sideways automatically for landscape photos.

Great for expense receipts, scanned contracts, ID and KYC documents, delivery photos, product sheets and photo albums. Also handy as a step in Make, Zapier or n8n: "new images in a folder → one PDF in Drive".

## What you get

- **One combined PDF** in your order, or **one PDF per image** (plus a ZIP)
- **JPG, PNG, WebP, AVIF, TIFF, GIF and SVG** in, a standard PDF out
- **A4, Letter, Legal, A5 or fit-to-image** pages, with auto, portrait or landscape orientation
- **Contain or cover** placement, margins in mm
- **Phone photos come out upright** (EXIF rotation applied)
- **Small files**: images capped at 300 dpi for A4 and re-encoded as JPEG (quality adjustable); optional **black and white** for scans
- PNG transparency kept on request

## Input

```json
{
  "files": [
    { "url": "https://example.com/receipt-1.jpg" },
    { "url": "https://example.com/receipt-2.png" }
  ],
  "mode": "merge",
  "outputName": "expenses-november",
  "pageSize": "a4",
  "orientation": "auto",
  "marginMm": 10
}
```

## Output

One dataset row per image, plus a last row with the combined PDF:

```json
{
  "name": "expenses-november.pdf",
  "combined": true,
  "pages": 2,
  "sizeKb": 412.6,
  "pdfUrl": "https://api.apify.com/v2/key-value-stores/…/records/expenses-november.pdf"
}
```

The `SUMMARY` record in the key-value store carries the same link. In one-per-image mode each row has its own `pdfUrl`, and `pdfs.zip` holds them all.

## Pricing

Pay per event: one `image-converted` per image that made it into a PDF. Images that fail (broken link, not an image, too big) are free. Cap spending with "Max cost per run".

## Free browser version

Doing it once? [toowl.my.id/en/image-to-pdf](https://toowl.my.id/en/image-to-pdf/) turns images into a PDF in your browser for free, without uploading them.

<!-- toowl-footer -->
## Call it from your code

```bash
curl -X POST "https://api.apify.com/v2/acts/toowl~image-to-pdf/run-sync-get-dataset-items" \
  -H "Authorization: Bearer $APIFY_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"files":[{"url":"https://example.com/a.jpg"},{"url":"https://example.com/b.jpg"}],"mode":"merge"}'
```

The same call works from Python (`apify-client`), JavaScript, Make, Zapier and n8n (Apify app/node or a plain HTTP request).

## Use it from AI agents (MCP)

Add this Actor as a tool to Claude, Cursor, VS Code or any MCP client through Apify's MCP server:

```
https://mcp.apify.com/?actors=toowl/image-to-pdf
```

The agent can then pass file URLs and read the results itself.

## More toowl file APIs

PDF to Markdown, PDF to Word & Excel, HTML/URL to PDF, OCR, Office to PDF, PDF compressor, PDF merge/split, PDF password protect, PDF to image, image to PDF, bulk watermark, image converter and compressor, background remover, AI upscaler, image to SVG, QR code and barcode generators, QR/barcode reader, favicon generator, video compressor, frame extractor and audio converter. All pay per file, all batch-friendly: [toowl.my.id/en/api](https://toowl.my.id/en/api/).

Questions or a format that fails? Open an issue on the Actor's **Issues** tab.
