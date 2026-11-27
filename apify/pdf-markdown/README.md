# PDF to Markdown — for LLMs, RAG and docs, in bulk

Convert PDFs into **clean, structured Markdown**: headings, bold/italic, bullet and numbered lists, and **real Markdown tables**. Feed the result straight into ChatGPT, Claude, LangChain, LlamaIndex or a vector database, or publish it as docs. Give a list of PDF URLs, get Markdown back.

## Why use it

- **Structure, not a text dump**: headings come from font sizes (H1–H3), short bold lines become small headings, lists keep their markers.
- **Tables as tables**: columns are found from the text layout, so reports, price lists and statements become `| a | b |` tables. A table that continues on the next page (repeated header) is merged into one.
- **Bold and italic** kept inline; Markdown characters escaped so the output renders correctly.
- **Optional page breaks** (`---`) for citing page numbers in RAG answers.
- **Fast and cheap**: no AI model, no GPU, no third-party API. Hundreds of pages per minute.
- **.md file per PDF** plus the Markdown right in the dataset for Zapier, Make, n8n or your code.

## Input

```json
{
  "files": [{ "url": "https://example.com/annual-report.pdf" }],
  "includeMarkdown": true,
  "pageBreaks": false,
  "maxPages": 200
}
```

## Output

```json
{
  "url": "https://example.com/annual-report.pdf",
  "name": "annual-report.pdf",
  "title": "Annual Report 2026",
  "pages": 24,
  "headings": 31,
  "tables": 6,
  "characters": 58210,
  "downloadUrl": "https://api.apify.com/v2/key-value-stores/…/records/0001-annual-report.md",
  "markdown": "# Annual Report 2026\n\n## Summary\n\nRevenue grew **18%** …\n\n| Region | Q2 | Q3 |\n| --- | --- | --- |\n…"
}
```

## Good to know

- Works on **digital PDFs** (exported from Word, Google Docs, LaTeX, reporting tools, websites). A **scanned** PDF has no text layer: run it through the OCR Actor first.
- Password-protected PDFs get an `error` row and are not charged.
- Images inside the PDF are not exported.

## Use cases

- Prepare PDFs for retrieval-augmented generation (RAG) and embeddings
- Turn manuals, policies and handbooks into docs-site pages
- Extract tables from reports and price lists
- Summarise or translate long PDFs with an LLM without losing structure

## Pricing

Pay per event: a small fee **per page** converted (see the Pricing tab). Files that fail are free. Cap spending with "Max cost per run" and "Max pages per PDF".

## Free browser version

[toowl.my.id/tools/pdf-to-markdown](https://toowl.my.id/tools/pdf-to-markdown/) converts a PDF in your browser, free. Same engine.
