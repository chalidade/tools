# PDF to JPG, PNG & WebP Converter (Bulk)

Convert **PDF pages to images** in bulk from URLs: every page or just a range, at any resolution from 36 to 600 DPI, as **JPG, PNG or WebP**. Each PDF also gets a **ZIP** with all its pages. Rendering is done by Poppler, the engine behind most Linux PDF viewers, so text and vector art come out crisp.

## Use cases

- **Thumbnails and previews** of uploaded PDFs for a website or app (`maxSide: 400`).
- Pages as images for **vision LLMs** (GPT-4o, Claude, Gemini) or for OCR at 300 DPI.
- Social posts and slides from a PDF deck.
- Archive scans as JPG, or print-quality PNG at 300–600 DPI.

## Features

- **Page selection**: `"1"`, `"1-3,7"`, `"10-"`, `"last"`.
- **DPI or fixed size**: 150 DPI by default; `maxSide` gives every page the same longest side.
- JPG / WebP quality, **grayscale**, **password-protected PDFs**.
- **ZIP per PDF** plus a link to every page image.
- **Pay per page rendered.** Failed files are free.

## Input

```json
{
  "files": [{ "url": "https://example.com/brochure.pdf" }],
  "format": "jpg",
  "dpi": 150,
  "pages": "1-5"
}
```

| Field | Default | Notes |
| --- | --- | --- |
| `files` | — | PDF URLs |
| `format` | `jpg` | `jpg`, `png`, `webp` |
| `dpi` | 150 | 36–600 |
| `pages` | all | e.g. `1-3,7`, `10-`, `last` |
| `quality` | 85 | JPG/WebP |
| `zip` | true | One ZIP per PDF |
| `maxSide` | — | px, overrides DPI |
| `grayscale` | false | |
| `password` | — | Secret |
| `maxPages` | 500 | Per PDF |
| `maxFileSizeMb` | 100 | |

## Output

```json
{
  "url": "https://example.com/brochure.pdf",
  "name": "brochure.pdf",
  "pages": 5,
  "totalPages": 12,
  "format": "jpg",
  "firstPage": "https://api.apify.com/v2/key-value-stores/…/records/0001-brochure-p1.jpg",
  "zipUrl": "https://api.apify.com/v2/key-value-stores/…/records/0001-brochure-pages.zip",
  "images": [
    { "page": 1, "downloadUrl": "https://api.apify.com/v2/key-value-stores/…/records/0001-brochure-p1.jpg", "width": 1240, "height": 1754, "size": 183402 }
  ]
}
```

## Pricing

Pay per event: one `pdf-page-rendered` per page. Pages over `maxPages` are skipped and not charged. Failed files are free.

## Free browser version

[toowl.my.id/en/pdf-to-image](https://toowl.my.id/en/pdf-to-image/) converts PDF pages to images in your browser, free, nothing uploaded.
