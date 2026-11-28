# OCR — Image & Scanned PDF to Text in bulk

Extract text from **photos, screenshots, receipts, invoices, ID cards, book pages and scanned PDFs**. Give a list of URLs, get clean text back, one dataset row per file. Powered by Tesseract OCR (LSTM models).

## Why use it

- **Images and PDFs** in one Actor: JPG, PNG, WebP, AVIF, GIF, TIFF and multi-page PDFs.
- **Smart with PDFs**: pages that already have real text (digital PDFs) are read directly, so they are exact and fast. Only scanned pages are OCR'd.
- **8 languages**: English, Indonesian/Malay, Spanish, French, German, Portuguese, Italian, Dutch. Mix them (e.g. `["eng", "spa"]`).
- **Pre-processing built in**: EXIF rotation, transparent PNGs flattened, small screenshots enlarged so tiny text reads well.
- **Layout modes** for documents, receipts/crops, or sparse text such as labels and UI screenshots.
- **Confidence score** per file (and per page) so you can flag poor scans.
- **No third-party API**: OCR runs inside the run; files are not sent anywhere else.

## Input

```json
{
  "files": [
    { "url": "https://example.com/receipt.jpg" },
    { "url": "https://example.com/scanned-contract.pdf" }
  ],
  "languages": ["eng"],
  "pageSegmentation": "auto",
  "maxPages": 50
}
```

## Output

```json
{
  "url": "https://example.com/receipt.jpg",
  "name": "receipt.jpg",
  "kind": "image",
  "pages": 1,
  "confidence": 93,
  "characters": 412,
  "text": "INVOICE #2026-0117\n\nDate: 27 November 2026\n..."
}
```

Turn on **Save a .txt file** for a download link per file, or **Include per-page text** to get `pageTexts` for PDFs (page number, text, confidence, and `source`: `ocr` or `text-layer`).

## Use cases

- Digitise scanned contracts, letters and archives for search or AI/RAG pipelines
- Read receipts and invoices before parsing totals and dates
- Pull text out of screenshots and social-media images
- Make product labels and packaging photos searchable

## Pricing

Pay per event: a fee per image or **per PDF page** read (see the Pricing tab). Files that fail are free. Cap spending with "Max cost per run" and "Max pages per PDF".

## Free browser version

[toowl.my.id/en/ocr](https://toowl.my.id/en/ocr/) reads text from a picture in your browser, free.

Engine: Tesseract OCR via tesseract.js (Apache-2.0); language models from tessdata (Apache-2.0).

<!-- toowl-footer -->
## Call it from your code

```bash
curl -X POST "https://api.apify.com/v2/acts/toowl~ocr-image-pdf-to-text/run-sync-get-dataset-items" \
  -H "Authorization: Bearer $APIFY_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"files":[{"url":"https://example.com/your-file"}]}'
```

The same call works from Python (`apify-client`), JavaScript, Make, Zapier and n8n (Apify app/node or a plain HTTP request).

## Use it from AI agents (MCP)

Add this Actor as a tool to Claude, Cursor, VS Code or any MCP client through Apify's MCP server:

```
https://mcp.apify.com/?actors=toowl/ocr-image-pdf-to-text
```

The agent can then pass file URLs and read the results itself.

## More toowl file APIs

PDF to Markdown, PDF to Word & Excel, HTML/URL to PDF, OCR, Office to PDF, PDF compressor, PDF merge/split, PDF password protect, PDF to image, image to PDF, bulk watermark, image converter and compressor, background remover, AI upscaler, image to SVG, QR code and barcode generators, QR/barcode reader, favicon generator, video compressor, frame extractor and audio converter. All pay per file, all batch-friendly: [toowl.my.id/en/api](https://toowl.my.id/en/api/).

Questions or a format that fails? Open an issue on the Actor's **Issues** tab.
