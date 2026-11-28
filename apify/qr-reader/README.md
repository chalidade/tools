# QR Code & Barcode Reader — bulk decode from image URLs

Decode QR codes and barcodes from thousands of images: photos of receipts, product shots, tickets, shipping labels, screenshots. Several codes per image, rotated, inverted (white-on-black), tiny or in big photos — powered by ZXing-C++.

## Supported codes

QR Code, Micro QR, rMQR, Data Matrix, Aztec, PDF417, MaxiCode, EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, Code 93, ITF, Codabar, GS1 DataBar (incl. Expanded/Limited), DX Film Edge.

## Why use it

- **Bulk**: give a list of image URLs, get a clean table back.
- **Robust**: tries harder, rotated, inverted and downscaled passes; finds small codes in 12 MP photos.
- **Up to 16 codes per image**, each with its format and (optionally) its four corner positions.
- **Restrict formats** (e.g. only `QRCode` or only `EAN13`) for speed and to avoid false hits.
- **Images in**: JPG, PNG, WebP, AVIF, GIF, TIFF, SVG.
- **No third-party API**: decoded inside the run.

## Input

```json
{
  "files": [{ "url": "https://example.com/ticket.jpg" }],
  "formats": ["QRCode"],
  "includePositions": false
}
```

## Output

One row per image. `text`/`format` hold the first code (handy for CSV/Excel export), `codes` holds all of them:

```json
{
  "url": "https://example.com/label.jpg",
  "name": "label.jpg",
  "found": 2,
  "text": "5901234123457",
  "format": "EAN13",
  "codes": [
    { "text": "5901234123457", "format": "EAN13", "contentType": "Text" },
    { "text": "https://toowl.my.id/", "format": "QRCode", "contentType": "Text", "ecLevel": "M" }
  ]
}
```

Images with no code get `found: 0`. Images that cannot be downloaded or decoded get an `error` and are not charged.

## Use cases

- Validate QR codes on printed material or packaging photos before print runs
- Extract product barcodes (EAN/UPC) from e-commerce photo catalogues
- Read ticket / voucher / invoice QR codes from uploaded images in a Zapier, Make or n8n flow
- Audit scraped images for embedded links

## Pricing

Pay per event: a small fee per scanned image (see the Pricing tab), whether or not a code is found. Cap spending with "Max cost per run".

## Free browser version

[toowl.my.id/en/qr-reader](https://toowl.my.id/en/qr-reader/) reads codes from your camera or a picture, free and offline.

<!-- toowl-footer -->
## Call it from your code

```bash
curl -X POST "https://api.apify.com/v2/acts/toowl~qr-barcode-reader/run-sync-get-dataset-items" \
  -H "Authorization: Bearer $APIFY_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"files":[{"url":"https://example.com/your-file"}]}'
```

The same call works from Python (`apify-client`), JavaScript, Make, Zapier and n8n (Apify app/node or a plain HTTP request).

## Use it from AI agents (MCP)

Add this Actor as a tool to Claude, Cursor, VS Code or any MCP client through Apify's MCP server:

```
https://mcp.apify.com/?actors=toowl/qr-barcode-reader
```

The agent can then pass file URLs and read the results itself.

## More toowl file APIs

PDF to Markdown, PDF to Word & Excel, HTML/URL to PDF, OCR, Office to PDF, PDF compressor, PDF merge/split, PDF password protect, PDF to image, image to PDF, bulk watermark, image converter and compressor, background remover, AI upscaler, image to SVG, QR code and barcode generators, QR/barcode reader, favicon generator, video compressor, frame extractor and audio converter. All pay per file, all batch-friendly: [toowl.my.id/en/api](https://toowl.my.id/en/api/).

Questions or a format that fails? Open an issue on the Actor's **Issues** tab.
