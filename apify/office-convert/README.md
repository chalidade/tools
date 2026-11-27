# Word, Excel & PowerPoint to PDF Converter (Bulk)

Convert **DOCX, DOC, XLSX, XLS, PPTX, PPT, ODT, ODS, ODP, RTF and CSV to PDF** in bulk from URLs, with the layout kept as close to Microsoft Office as LibreOffice gets. The same Actor also converts **between editable formats**: old DOC/XLS/PPT to modern DOCX/XLSX/PPTX, Office ↔ OpenDocument, documents to plain text and every sheet of a workbook to its own CSV.

No Microsoft Office licence, no Windows server, no upload to a third-party converter: LibreOffice runs inside the Actor.

## Use cases

- Turn invoices, contracts and reports generated as DOCX into PDF before emailing or archiving them.
- **PDF/A** for tenders, courts and government portals that refuse plain PDF.
- Export every sheet of an Excel file to CSV for a data pipeline, or fit each sheet on one PDF page.
- Batch-upgrade a folder of legacy `.doc` / `.xls` / `.ppt` files to DOCX / XLSX / PPTX.
- Presentations to PDF with speaker notes pages.

## Features

- **Office-compatible fonts** installed: Carlito (Calibri), Caladea (Cambria), Liberation (Arial, Times New Roman, Courier New), Noto for Asian scripts and emoji.
- **PDF/A-2b**, **one page per sheet**, **notes pages**, optional **picture recompression** for smaller PDFs.
- Formulas are calculated, so the PDF shows values, not `=SUM(…)`.
- File type detected from the content when the URL has no extension.
- Macros never run.
- **Pay per document.** Failed files are free.

## Input

```json
{
  "files": [
    { "url": "https://example.com/contract.docx" },
    { "url": "https://example.com/budget.xlsx" }
  ],
  "outputFormat": "pdf",
  "pdfA": false,
  "onePagePerSheet": true
}
```

| Field | Default | Notes |
| --- | --- | --- |
| `files` | — | Document URLs |
| `outputFormat` | `pdf` | `pdf`, `office` (DOCX/XLSX/PPTX), `odf` (ODT/ODS/ODP), `text` (TXT, or one CSV per sheet) |
| `pdfA` | false | PDF/A-2b |
| `onePagePerSheet` | false | Spreadsheets → PDF |
| `includeNotes` | false | Presentations → PDF |
| `imageQuality` | — | 10–100: recompress pictures inside the PDF |
| `maxFileSizeMb` | 100 | |
| `timeoutSecs` | 180 | Per document |

## Output

```json
{
  "url": "https://example.com/budget.xlsx",
  "name": "budget.xlsx",
  "downloadUrl": "https://api.apify.com/v2/key-value-stores/…/records/0002-budget.pdf",
  "inputFormat": "xlsx",
  "outputFormat": "pdf",
  "pages": 3,
  "sizeBefore": 48211,
  "sizeAfter": 61450
}
```

A workbook exported to CSV also gets `files`: one link per sheet.

## Call it from code

```bash
curl -X POST "https://api.apify.com/v2/acts/toowl~office-converter/run-sync-get-dataset-items?token=$APIFY_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"files":[{"url":"https://example.com/contract.docx"}]}'
```

Works the same from Python, JavaScript, Make, Zapier and n8n (Apify app/node).

## Pricing

Pay per event: one `document-converted` per input document. Failed documents are free.

## Free browser version

[toowl.my.id/en/doc-to-pdf](https://toowl.my.id/en/doc-to-pdf/), [excel-to-pdf](https://toowl.my.id/en/excel-to-pdf/) and [ppt-to-pdf](https://toowl.my.id/en/ppt-to-pdf/) convert single files in your browser, free, nothing uploaded.

<!-- toowl-footer -->
## Use it from AI agents (MCP)

Add this Actor as a tool to Claude, Cursor, VS Code or any MCP client through Apify's MCP server:

```
https://mcp.apify.com/?actors=toowl/office-converter
```

The agent can then pass file URLs and read the results itself.

## More toowl file APIs

PDF to Markdown, OCR, Office to PDF, PDF compressor, PDF merge/split, PDF to image, image converter and compressor, background remover, AI upscaler, image to SVG, QR/barcode reader, video compressor, frame extractor and audio converter. All pay per file, all batch-friendly: [toowl.my.id/en/api](https://toowl.my.id/en/api/).

Questions or a format that fails? Open an issue on the Actor's **Issues** tab.
