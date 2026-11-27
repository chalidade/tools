# PDF Merge, Split, Extract & Rotate Pages (Bulk)

One Actor for everyday PDF page work, in bulk from URLs:

- **Merge** many PDFs into one, in the order you list them.
- **Split** each PDF into single pages, into files of N pages, or by custom ranges (`1-2, 3-10, 11-`).
- **Extract** the pages you want, in the order you want (`3,1,5-7`).
- **Delete** pages.
- **Rotate** all or some pages by 90°, 180° or 270°.
- **Unlock**: remove the password and the print/copy restrictions (you give the password that opens it).

Built on **qpdf**, which rewrites the PDF structure without re-rendering anything: text stays selectable, links and bookmarks inside the kept pages keep working, quality is untouched, and files usually come out a little smaller.

## Use cases

- Join a cover letter, CV and certificates into one application PDF.
- Split a scanned batch into one PDF per page, or a 500-page export into chapters.
- Drop blank or confidential pages before sharing.
- Fix sideways scans.
- Automate all of it from Make, Zapier, n8n or your own code.

## Input

```json
{
  "operation": "merge",
  "files": [
    { "url": "https://example.com/cover.pdf" },
    { "url": "https://example.com/report.pdf" }
  ],
  "outputName": "application"
}
```

| Field | Default | Used by | Notes |
| --- | --- | --- | --- |
| `operation` | `merge` | | `merge`, `split`, `extract`, `delete`, `rotate`, `unlock` |
| `files` | — | all | PDF URLs |
| `pages` | — | extract, delete, rotate | `1-3,7`, `10-`, `last` |
| `splitEvery` | 1 | split | pages per file |
| `splitRanges` | — | split | `1-2, 3-10, 11-` |
| `rotation` | `90` | rotate | `90`, `180`, `270` (clockwise) |
| `outputName` | `merged` | merge | |
| `password` | — | all | Secret, for protected PDFs |
| `maxFileSizeMb` | 100 | all | |

## Output

Merge gives one row; the other operations give one row per input PDF.

```json
{
  "url": "https://example.com/book.pdf",
  "name": "book.pdf",
  "operation": "split",
  "downloadUrl": "https://api.apify.com/v2/key-value-stores/…/records/0001-book-split.zip",
  "parts": 3,
  "files": [
    { "name": "book-1-2.pdf", "pages": "1-2", "downloadUrl": "https://api.apify.com/v2/key-value-stores/…/records/0001-book-1-2.pdf", "size": 48211 }
  ]
}
```

## Pricing

Pay per event: one `pdf-processed` per input PDF (merging 5 files = 5 events). Failed files are free.

## Free browser version

[merge-pdf](https://toowl.my.id/en/merge-pdf/), [split-pdf](https://toowl.my.id/en/split-pdf/), [organize-pdf](https://toowl.my.id/en/organize-pdf/) and [unlock-pdf](https://toowl.my.id/en/unlock-pdf/) on toowl.my.id do the same in your browser, free, nothing uploaded.
