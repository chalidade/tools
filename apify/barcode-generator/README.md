# Barcode Generator — bulk EAN-13, UPC, Code 128, SVG & PNG

Paste a list of product numbers, SKUs or serials and get **print-ready barcodes** back: PNG or vector SVG, one ZIP, check digits validated so you don't print 5,000 labels with a typo.

Great for product labels, inventory and asset tags, shipping cartons (ITF-14 / GS1-128), books (ISBN) and warehouse bins.

## What you get

- **Bulk**: one barcode per line, thousands per run
- **Auto-detect**: 13 digits → EAN-13, 12 → UPC-A, 8 → EAN-8, 14 → ITF-14, anything else → Code 128
- **Symbologies**: EAN-13, EAN-8, UPC-A, UPC-E, ISBN, Code 128, Code 39, Code 93, ITF-14, Interleaved 2 of 5, GS1-128, Codabar, plus 2D: Data Matrix, PDF417, Aztec, QR
- **PNG** (scale 1–10 px per module) and/or **SVG** (vector, text included as paths, prints sharp at any size)
- **Classic retail layout** for EAN/UPC (first digit outside the bars), optional human-readable text
- **Custom colours**, transparent background, adjustable bar height and quiet zone
- **Validation**: wrong length or check digit gets a clear error row (and isn't charged)
- **One ZIP** with all files + a dataset row per barcode

Every symbology here was decoded back in our tests with the [QR & Barcode Reader](https://apify.com/toowl/qr-barcode-reader?fpr=toowl) engine.

## Input

```json
{
  "codes": ["5901234123457", "036000291452", "SKU-2026-00042"],
  "type": "auto",
  "format": "both",
  "scale": 4,
  "heightMm": 15,
  "includeText": true
}
```

Mix types in one run through the API: `{ "text": "HELLO-42", "type": "datamatrix", "name": "bin-42" }`.

GS1-128 values use application identifiers in brackets: `(01)09501101530003(17)250101`.

## Output

```json
{
  "text": "5901234123457",
  "type": "ean13",
  "name": "5901234123457",
  "pngUrl": "https://api.apify.com/v2/key-value-stores/…/records/0001-5901234123457.png",
  "svgUrl": "https://api.apify.com/v2/key-value-stores/…/records/0001-5901234123457.svg"
}
```

Failed values get `{ "input": "…", "error": "Incorrect EAN-13 check digit provided" }`.

## Pricing

Pay per event: one `barcode-generated` per barcode. Invalid values are free. Cap spending with "Max cost per run".

## Free browser version

Need a handful, or a printable label sheet? [toowl.my.id/en/barcode](https://toowl.my.id/en/barcode/) makes them in your browser for free.

## Engine

[bwip-js](https://github.com/metafloor/bwip-js) (MIT), a JavaScript port of Barcode Writer in Pure PostScript.

<!-- toowl-footer -->
## Call it from your code

```bash
curl -X POST "https://api.apify.com/v2/acts/toowl~barcode-generator/run-sync-get-dataset-items" \
  -H "Authorization: Bearer $APIFY_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"codes":["5901234123457","ABC-12345"],"type":"auto","format":"png"}'
```

The same call works from Python (`apify-client`), JavaScript, Make, Zapier and n8n (Apify app/node or a plain HTTP request).

## Use it from AI agents (MCP)

Add this Actor as a tool to Claude, Cursor, VS Code or any MCP client through Apify's MCP server:

```
https://mcp.apify.com/?actors=toowl/barcode-generator
```

The agent can then pass file URLs and read the results itself.

## More toowl file APIs

PDF to Markdown, PDF to Word & Excel, HTML/URL to PDF, OCR, Office to PDF, PDF compressor, PDF merge/split, PDF password protect, PDF to image, image to PDF, bulk watermark, image converter and compressor, background remover, AI upscaler, image to SVG, QR code and barcode generators, QR/barcode reader, favicon generator, video compressor, frame extractor and audio converter. All pay per file, all batch-friendly: [toowl.my.id/en/api](https://toowl.my.id/en/api/).

Questions or a format that fails? Open an issue on the Actor's **Issues** tab.
