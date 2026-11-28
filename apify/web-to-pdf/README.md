# HTML to PDF, URL to PDF & Markdown to PDF — bulk, with templates

A PDF API that just works: give it **web page URLs**, **HTML**, **Markdown**, or **one HTML template plus a list of records**, and get pixel-perfect PDFs from real headless Chrome. One PDF per document, download links in the dataset, and everything in one ZIP.

Typical jobs:

- 🧾 **Invoices, receipts, certificates, tickets, payslips** from your data (mail-merge style), hundreds per run
- 🌐 **Save web pages as PDF** for archiving, compliance, offline reading or evidence
- 📝 **Markdown to PDF** for docs, READMEs, LLM output and reports
- 🔌 A drop-in **HTML-to-PDF endpoint** for Make, Zapier, n8n or your backend, with no Chrome to host yourself

## What you get

- Real Chrome rendering: modern CSS (flexbox, grid, web fonts), JavaScript, charts, SVG
- **A4, Letter, Legal, A3, A5, Tabloid**, portrait or landscape, margins in mm, scale
- **Page numbers** ("1 / 5") in the footer, **backgrounds** on or off, or the page's own `@page` size
- **Wait options**: network idle, load, DOM ready, plus an extra delay for animations
- **Hide elements** with CSS selectors (cookie banners, chat widgets) before printing
- **Selectable text and clickable links** in the PDF, plus a document outline from headings
- Markdown with GitHub tables, task lists and code blocks, in a clean paper style
- **Template mail-merge**: `{{field}}` (escaped), `{{{field}}}` (raw HTML), `{{customer.name}}` (nested)

## Input examples

**Invoices from data**

```json
{
  "template": "<h1>Invoice {{fileName}}</h1><p>Bill to: {{customer.name}}</p><p>Total: {{total}}</p>",
  "records": [
    { "fileName": "INV-1042", "customer": { "name": "Acme Ltd" }, "total": "$1,250.00" },
    { "fileName": "INV-1043", "customer": { "name": "Globex" }, "total": "$980.00" }
  ],
  "format": "A4",
  "pageNumbers": true
}
```

**Web pages**

```json
{
  "urls": [{ "url": "https://example.com/pricing" }, { "url": "https://example.com/terms" }],
  "hideSelectors": ["#cookie-banner"],
  "media": "screen"
}
```

**Mixed bulk documents**

```json
{
  "documents": [
    { "name": "readme", "markdown": "# Hello\n\nSome **Markdown**." },
    { "name": "letter", "html": "<html><body><h1>Dear customer</h1></body></html>" },
    { "url": "https://example.com/report" }
  ]
}
```

## Output

One dataset row per document:

```json
{
  "name": "INV-1042",
  "pages": 1,
  "sizeKb": 15.7,
  "pdfUrl": "https://api.apify.com/v2/key-value-stores/…/records/0001-INV-1042.pdf",
  "source": "html"
}
```

Plus `pdfs.zip` (when there is more than one PDF) and a `SUMMARY` record in the run's key-value store.

## Pricing

Pay per event: one `pdf-generated` per PDF, whatever its page count. Documents that fail (a page that does not load, a timeout) are free. Cap spending with "Max cost per run".

## Tips

- Images and fonts in HTML must be reachable by URL (or embedded as `data:` URLs).
- For HTML you control, `@page { size: A4; margin: 0 }` plus "Use the page's own @page size" gives you full control.
- Sites behind a login or a bot wall won't render; this Actor prints what an anonymous browser sees.

## Free browser version

Need one Markdown file as PDF or Word? [toowl.my.id/en/markdown-to-pdf](https://toowl.my.id/en/markdown-to-pdf/) does it in your browser for free.

<!-- toowl-footer -->
## Call it from your code

```bash
curl -X POST "https://api.apify.com/v2/acts/toowl~html-to-pdf/run-sync-get-dataset-items" \
  -H "Authorization: Bearer $APIFY_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"urls":[{"url":"https://example.com"}],"format":"A4","pageNumbers":true}'
```

The same call works from Python (`apify-client`), JavaScript, Make, Zapier and n8n (Apify app/node or a plain HTTP request).

## Use it from AI agents (MCP)

Add this Actor as a tool to Claude, Cursor, VS Code or any MCP client through Apify's MCP server:

```
https://mcp.apify.com/?actors=toowl/html-to-pdf
```

The agent can then pass file URLs and read the results itself.

## More toowl file APIs

Speech to text & subtitles, AI vocal remover, text to speech, AI object remover, PDF to Markdown, PDF to Word & Excel, HTML/URL to PDF, OCR, Office to PDF, PDF compressor, PDF merge/split, PDF password protect, PDF to image, image to PDF, bulk watermark, image converter and compressor, background remover, AI upscaler, image to SVG, QR code and barcode generators, QR/barcode reader, favicon generator, video compressor, frame extractor and audio converter. All pay per file, all batch-friendly: [toowl.my.id/en/api](https://toowl.my.id/en/api/).

Questions or a format that fails? Open an issue on the Actor's **Issues** tab.
