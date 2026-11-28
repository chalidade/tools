# PDF Compressor — bulk, keeps text selectable

Shrink PDFs in bulk from a list of URLs. Embedded photos are downsampled and re-encoded, every other stream is recompressed, and objects are packed into compressed object streams. **Text stays real, selectable, searchable text** — pages are never flattened into images like many online compressors do.

Typical results: scanned or photo-heavy PDFs get **60–95% smaller**; text-only PDFs get a few percent smaller (and are never made bigger — if a file can't be improved you get the original back and `alreadyOptimal: true`).

## Why use it

- **Bulk**: hundreds of PDFs in one run, processed in parallel.
- **Keeps quality where it matters**: text, vector graphics, fonts and links are untouched; only photos are resampled.
- **Four presets** plus fine control over max image size and JPEG quality.
- **Password-protected PDFs** supported (give the password).
- **No third-party API**: the PDF is processed inside the run with qpdf and libvips. Nothing is sent anywhere else.
- **Pay only for PDFs that worked.** Failed downloads or broken files are reported but not charged.

## Input

| Field | What it does |
| --- | --- |
| `files` | PDF URLs (public links, S3/GCS presigned URLs, Dropbox `?dl=1`, Google Drive direct links…) |
| `level` | `light` (print, max 2400 px, q82), `medium` (email/web, 1600 px, q70 — default), `strong` (1100 px, q55), `extreme` (800 px, q40) |
| `maxImageSide`, `jpegQuality` | Override the preset |
| `password` | Password for protected PDFs (output is saved without a password) |
| `maxFileSizeMb` | Skip files above this size (default 100 MB) |

```json
{
  "files": [{ "url": "https://example.com/report.pdf" }],
  "level": "medium"
}
```

## Output

Each compressed PDF is saved in the run's key-value store. The dataset has one row per input file:

```json
{
  "url": "https://example.com/report.pdf",
  "name": "report.pdf",
  "downloadUrl": "https://api.apify.com/v2/key-value-stores/…/records/0001-report.pdf",
  "sizeBefore": 3435577,
  "sizeAfter": 193430,
  "savedPercent": 94.4,
  "imagesFound": 3,
  "imagesShrunk": 3,
  "alreadyOptimal": false
}
```

Failed files get a row with `error` instead (and are not charged). A `SUMMARY` record in the key-value store counts ok/failed files.

## Use it from code, Zapier, Make or n8n

Call the Actor through the [Apify API](https://docs.apify.com/api/v2) or the official integrations: e.g. compress every PDF that lands in a Google Drive folder or an S3 bucket, then email the `downloadUrl`.

```bash
curl -X POST "https://api.apify.com/v2/acts/<username>~pdf-compressor/run-sync-get-dataset-items?token=$APIFY_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"files":[{"url":"https://example.com/report.pdf"}],"level":"strong"}'
```

## Pricing

Pay per event: you pay a small fee per successfully compressed PDF (see the Pricing tab), no subscription. Set "Max cost per run" to cap any run — the Actor stops cleanly when the budget is reached.

## Limits

- What gets smaller: 8-bit RGB/grayscale JPEG photos, plus every compressible stream. CMYK and other special colour spaces, and lossless (PNG-style) images, are kept as they are.
- Very large PDFs need memory: give the run ~4× the file size (1 GB covers files up to ~200 MB).

## Want it in the browser instead?

The same engine runs free in your browser at [toowl.my.id/en/compress-pdf](https://toowl.my.id/en/compress-pdf/) — nothing uploaded.

<!-- toowl-footer -->
## Use it from AI agents (MCP)

Add this Actor as a tool to Claude, Cursor, VS Code or any MCP client through Apify's MCP server:

```
https://mcp.apify.com/?actors=toowl/pdf-compressor
```

The agent can then pass file URLs and read the results itself.

## More toowl file APIs

Speech to text & subtitles, AI vocal remover, text to speech, AI object remover, PDF to Markdown, PDF to Word & Excel, HTML/URL to PDF, OCR, Office to PDF, PDF compressor, PDF merge/split, PDF password protect, PDF to image, image to PDF, bulk watermark, image converter and compressor, background remover, AI upscaler, image to SVG, QR code and barcode generators, QR/barcode reader, favicon generator, video compressor, frame extractor and audio converter. All pay per file, all batch-friendly: [toowl.my.id/en/api](https://toowl.my.id/en/api/).

Questions or a format that fails? Open an issue on the Actor's **Issues** tab.
