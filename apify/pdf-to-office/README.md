# PDF to Word & Excel Converter — bulk DOCX and XLSX

Turn PDFs into files you can actually edit: **Word (.docx)** with the text flow, fonts, bold and italic kept, and **Excel (.xlsx)** with tables split into real cells. Numbers and dates come out as real values, so your formulas work straight away.

Give it a list of PDF URLs (invoices, bank statements, reports, price lists, contracts) and get one Word and/or Excel file per PDF, with download links in the dataset. No Microsoft Office, no LibreOffice, no upload to a third-party converter.

## What you get

- **Word (.docx)**: paragraphs rebuilt from the PDF lines (not one text box per line), headings and body sizes, bold/italic, centred titles, indents, right-aligned "label ⇥ date" lines and a page break per PDF page
- **Excel (.xlsx)**: tables detected from column positions, header rows bold, borders, column widths, and loose text lines kept in order around the tables
- **Real numbers**: `1.234,56`, `1,234.56`, `12%` and dates become numeric cells (decimal style detected per file); switch it off to keep text as-is
- **One sheet or one per page**: in one-sheet mode a table header repeated at the top of every page is kept once, which is great for multi-page statements
- **Both at once**: `"output": "both"` writes the .docx and the .xlsx from a single read of the PDF
- Password-protected PDFs and scans are reported per file (and not charged). Scans: run the [OCR Actor](https://apify.com/toowl/ocr-image-pdf-to-text?fpr=toowl) first

## Input

```json
{
  "files": [
    { "url": "https://example.com/invoice-1042.pdf" },
    { "url": "https://example.com/bank-statement-october.pdf" }
  ],
  "output": "both",
  "sheets": "merge",
  "convertNumbers": true
}
```

## Output

One dataset row per PDF:

```json
{
  "name": "bank-statement-october.pdf",
  "title": "Account statement",
  "pages": 4,
  "paragraphs": 61,
  "docxUrl": "https://api.apify.com/v2/key-value-stores/…/records/0002-bank-statement-october.docx",
  "tables": 4,
  "sheets": 1,
  "rows": 132,
  "xlsxUrl": "https://api.apify.com/v2/key-value-stores/…/records/0002-bank-statement-october.xlsx"
}
```

The files themselves sit in the run's key-value store, with a `SUMMARY` record.

## Pricing

Pay per event: one `pdf-page-converted` per PDF page (Word, Excel or both, same price). Files that fail (locked, scanned, not a PDF) are free. Cap spending with "Max cost per run" and limit long files with `maxPages`.

## Good to know

Word output follows the text flow, so it is easy to edit; it does not copy pictures or exact positions. If you need text as Markdown for an LLM instead, use [PDF to Markdown](https://apify.com/toowl/pdf-to-markdown?fpr=toowl).

## Free browser version

Converting one file? [PDF to Word](https://toowl.my.id/en/pdf-to-word/) and [PDF to Excel](https://toowl.my.id/en/pdf-to-excel/) on toowl.my.id run the same engine in your browser for free, without uploading the file.

<!-- toowl-footer -->
## Call it from your code

```bash
curl -X POST "https://api.apify.com/v2/acts/toowl~pdf-to-word-excel/run-sync-get-dataset-items" \
  -H "Authorization: Bearer $APIFY_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"files":[{"url":"https://example.com/invoice.pdf"}],"output":"both"}'
```

The same call works from Python (`apify-client`), JavaScript, Make, Zapier and n8n (Apify app/node or a plain HTTP request).

## Use it from AI agents (MCP)

Add this Actor as a tool to Claude, Cursor, VS Code or any MCP client through Apify's MCP server:

```
https://mcp.apify.com/?actors=toowl/pdf-to-word-excel
```

The agent can then pass file URLs and read the results itself.

## More toowl file APIs

PDF to Markdown, PDF to Word & Excel, HTML/URL to PDF, OCR, Office to PDF, PDF compressor, PDF merge/split, PDF password protect, PDF to image, image to PDF, bulk watermark, image converter and compressor, background remover, AI upscaler, image to SVG, QR code and barcode generators, QR/barcode reader, favicon generator, video compressor, frame extractor and audio converter. All pay per file, all batch-friendly: [toowl.my.id/en/api](https://toowl.my.id/en/api/).

Questions or a format that fails? Open an issue on the Actor's **Issues** tab.
