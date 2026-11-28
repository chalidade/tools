# QR Code Generator — bulk, with logo, SVG & PNG

Turn a list of URLs or texts into **ready-to-print QR codes** in one run: PNG or SVG, any size, your colours, rounded or dot styles, your **logo in the middle**, and everything bundled in **one ZIP**.

Made for product labels, event badges, restaurant tables, packaging, flyers, asset tags and anything else where you need 10 (or 10,000) codes and don't feel like clicking a website 10,000 times.

## What you get

- **Bulk**: one QR code per line, as many lines as you like
- **PNG** (64–4096 px) and/or **SVG** (vector, perfect for print and Figma/Illustrator)
- **Custom colours** and **transparent background**
- **Styles**: classic squares, rounded, or dots. Finder squares stay solid so every phone camera still reads them
- **Logo in the middle**: give an image URL, error correction switches to H and small codes are bumped up a size so they keep scanning
- **One ZIP** with all files, plus a dataset row per code with direct links
- Works for **URLs, plain text, Wi-Fi logins, vCards, WhatsApp links, emails, phone numbers** (anything phone cameras understand)

Every code is checked to scan in our own tests with the [QR & Barcode Reader](https://apify.com/toowl/qr-barcode-reader?fpr=toowl) engine.

## Input

```json
{
  "items": [
    "https://example.com/menu",
    "https://example.com/table/12",
    "WIFI:T:WPA;S:Cafe Guest;P:coffee123;;"
  ],
  "format": "both",
  "size": 1024,
  "style": "rounded",
  "foreground": "#111827",
  "background": "#ffffff",
  "logoUrl": "https://example.com/logo.png"
}
```

Via the API you can also name each file: `{ "text": "https://example.com/p/42", "name": "product-42" }`.

### Handy formats

| What | Text to put in the item |
| --- | --- |
| Wi-Fi | `WIFI:T:WPA;S:NetworkName;P:password;;` |
| WhatsApp chat | `https://wa.me/6281234567890?text=Hello` |
| Email | `mailto:hi@example.com?subject=Hello` |
| Phone call | `tel:+6281234567890` |
| Contact card | `BEGIN:VCARD\nVERSION:3.0\nFN:Jane Doe\nTEL:+123456\nEND:VCARD` |

## Output

One dataset row per code:

```json
{
  "text": "https://example.com/menu",
  "name": "example.com-menu",
  "version": 5,
  "modules": 37,
  "errorCorrection": "H",
  "pngUrl": "https://api.apify.com/v2/key-value-stores/…/records/0001-example.com-menu.png",
  "svgUrl": "https://api.apify.com/v2/key-value-stores/…/records/0001-example.com-menu.svg"
}
```

Plus `qr-codes.zip` (all files) and a `SUMMARY` record in the run's key-value store.

## Pricing

Pay per event: one `qr-generated` per QR code. Items that fail (for example too much text for one code) are free. Cap spending with "Max cost per run".

## Free browser version

Need just one or two? [toowl.my.id/en/qr-generator](https://toowl.my.id/en/qr-generator/) makes them in your browser for free. Same drawing engine.

<!-- toowl-footer -->
## Call it from your code

```bash
curl -X POST "https://api.apify.com/v2/acts/toowl~qr-code-generator/run-sync-get-dataset-items" \
  -H "Authorization: Bearer $APIFY_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"items":["https://example.com/menu","https://example.com/table/12"],"format":"png"}'
```

The same call works from Python (`apify-client`), JavaScript, Make, Zapier and n8n (Apify app/node or a plain HTTP request).

## Use it from AI agents (MCP)

Add this Actor as a tool to Claude, Cursor, VS Code or any MCP client through Apify's MCP server:

```
https://mcp.apify.com/?actors=toowl/qr-code-generator
```

The agent can then pass file URLs and read the results itself.

## More toowl file APIs

PDF to Markdown, PDF to Word & Excel, HTML/URL to PDF, OCR, Office to PDF, PDF compressor, PDF merge/split, PDF password protect, PDF to image, image to PDF, bulk watermark, image converter and compressor, background remover, AI upscaler, image to SVG, QR code and barcode generators, QR/barcode reader, favicon generator, video compressor, frame extractor and audio converter. All pay per file, all batch-friendly: [toowl.my.id/en/api](https://toowl.my.id/en/api/).

Questions or a format that fails? Open an issue on the Actor's **Issues** tab.
