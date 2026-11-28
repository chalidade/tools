# PDF Password Protect & Unlock — bulk, AES-256, per-file passwords

Lock a whole batch of PDFs with a password in one run, or give **every file its own password**: payslips that open with the employee's ID, statements that open with the customer's birth date, reports for each client. You can also block **printing, copying and editing**, or remove the password from PDFs you're allowed to open.

Encryption is **AES-256**, the strongest the PDF format offers, and it opens in Adobe Acrobat, Chrome, Edge, macOS Preview and every modern phone. Done with [qpdf](https://qpdf.sourceforge.io/), no third-party upload service.

## What you get

- **Protect**: an open password (AES-256) plus permissions for printing, copying text/images, editing, comments, forms and page changes
- **Per-file passwords**: `{ "url": "…", "password": "…" }` per item, or a URL → password map
- **Restrictions only**: no open password, but no copying or printing
- **Owner password**: random by default (nobody can lift the restrictions), or your own
- **Unlock**: removes the open password and every restriction (give the password when the PDF asks for one). Wrong passwords are reported per file
- **One ZIP** with all results, plus a dataset row per PDF

## Input

Same password for all:

```json
{
  "operation": "protect",
  "files": [
    { "url": "https://example.com/report-q3.pdf" },
    { "url": "https://example.com/report-q4.pdf" }
  ],
  "password": "S3cret-2026",
  "allowPrint": true,
  "allowCopy": false
}
```

A password per file (API):

```json
{
  "operation": "protect",
  "files": [
    { "url": "https://example.com/payslips/emp-1001.pdf", "password": "1001-19900415" },
    { "url": "https://example.com/payslips/emp-1002.pdf", "password": "1002-19880102" }
  ]
}
```

Unlock:

```json
{
  "operation": "unlock",
  "files": [{ "url": "https://example.com/locked.pdf" }],
  "password": "the-open-password"
}
```

## Output

```json
{
  "name": "emp-1001.pdf",
  "operation": "protect",
  "opensWithPassword": true,
  "encryption": "AES-256",
  "sizeKb": 84.2,
  "pdfUrl": "https://api.apify.com/v2/key-value-stores/…/records/0001-emp-1001.pdf"
}
```

Passwords are never written to the dataset, the log or the key-value store. Store input passwords in Apify secrets (the fields are marked secret).

## Pricing

Pay per event: one `pdf-secured` per PDF protected or unlocked. Files that fail (wrong password, already protected, not a PDF) are free.

## Free browser version

One file? [Protect PDF](https://toowl.my.id/en/protect-pdf/) and [Unlock PDF](https://toowl.my.id/en/unlock-pdf/) on toowl.my.id do it in your browser for free, without uploading anything.

<!-- toowl-footer -->
## Call it from your code

```bash
curl -X POST "https://api.apify.com/v2/acts/toowl~pdf-password-protect/run-sync-get-dataset-items" \
  -H "Authorization: Bearer $APIFY_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"operation":"protect","files":[{"url":"https://example.com/a.pdf","password":"s3cret"}]}'
```

The same call works from Python (`apify-client`), JavaScript, Make, Zapier and n8n (Apify app/node or a plain HTTP request).

## Use it from AI agents (MCP)

Add this Actor as a tool to Claude, Cursor, VS Code or any MCP client through Apify's MCP server:

```
https://mcp.apify.com/?actors=toowl/pdf-password-protect
```

The agent can then pass file URLs and read the results itself.

## More toowl file APIs

PDF to Markdown, PDF to Word & Excel, HTML/URL to PDF, OCR, Office to PDF, PDF compressor, PDF merge/split, PDF password protect, PDF to image, image to PDF, bulk watermark, image converter and compressor, background remover, AI upscaler, image to SVG, QR code and barcode generators, QR/barcode reader, favicon generator, video compressor, frame extractor and audio converter. All pay per file, all batch-friendly: [toowl.my.id/en/api](https://toowl.my.id/en/api/).

Questions or a format that fails? Open an issue on the Actor's **Issues** tab.
