# Favicon Generator — ICO, Apple touch icon, PWA manifest, in bulk

Give it a logo URL, get back **everything a website or PWA needs** in one ZIP: `favicon.ico`, PNG favicons, Apple touch icon, Android/PWA icons, a maskable icon, `site.webmanifest` and the HTML tags to paste. Do it for one site or for 500 client sites in one run.

## What's in each ZIP

| File | Size | Used by |
| --- | --- | --- |
| `favicon.ico` | 16, 32, 48 | Every browser, old and new |
| `favicon-16x16.png`, `favicon-32x32.png` | 16, 32 | Browser tabs |
| `apple-touch-icon.png` | 180 | iPhone / iPad home screen (always square, filled background) |
| `android-chrome-192x192.png`, `android-chrome-512x512.png` | 192, 512 | Android, PWA install |
| `maskable-512x512.png` | 512 | Android adaptive icons (logo inside the safe zone) |
| `site.webmanifest` | | PWA manifest with name, colours and icons |
| `how-to-use.html` | | The `<link>` tags to paste in your `<head>` |

## Options

- **Shape**: square, rounded square or circle
- **Fit**: contain (whole logo) or cover (fill and crop)
- **Padding** around the logo
- **Background** colour, or keep transparency
- **Theme colour** for the manifest and the iOS/maskable background
- **Bulk**: one favicon set per logo URL

## Input

```json
{
  "files": [{ "url": "https://example.com/logo.png" }],
  "appName": "My App",
  "themeColor": "#0f172a",
  "shape": "rounded",
  "paddingPercent": 8
}
```

## Output

```json
{
  "url": "https://example.com/logo.png",
  "name": "logo.png",
  "appName": "My App",
  "files": ["favicon.ico", "favicon-16x16.png", "…", "site.webmanifest"],
  "previewUrl": "https://api.apify.com/v2/key-value-stores/…/records/0001-logo-512.png",
  "zipUrl": "https://api.apify.com/v2/key-value-stores/…/records/0001-logo-favicons.zip",
  "html": "<link rel=\"icon\" href=\"/favicon.ico\" sizes=\"48x48\">…",
  "manifest": { "name": "My App", "icons": ["…"] }
}
```

## Pricing

Pay per event: one `favicon-set-generated` per logo (the whole set). Failed images are free.

## Free browser version

[toowl.my.id/en/favicon-generator](https://toowl.my.id/en/favicon-generator/) builds the same set in your browser, free, nothing uploaded. It can also make an icon from a letter or emoji.

<!-- toowl-footer -->
## Call it from your code

```bash
curl -X POST "https://api.apify.com/v2/acts/toowl~favicon-generator/run-sync-get-dataset-items" \
  -H "Authorization: Bearer $APIFY_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"files":[{"url":"https://example.com/logo.png"}],"appName":"My App"}'
```

The same call works from Python (`apify-client`), JavaScript, Make, Zapier and n8n (Apify app/node or a plain HTTP request).

## Use it from AI agents (MCP)

Add this Actor as a tool to Claude, Cursor, VS Code or any MCP client through Apify's MCP server:

```
https://mcp.apify.com/?actors=toowl/favicon-generator
```

The agent can then pass file URLs and read the results itself.

## More toowl file APIs

Speech to text & subtitles, AI vocal remover, text to speech, AI object remover, PDF to Markdown, PDF to Word & Excel, HTML/URL to PDF, OCR, Office to PDF, PDF compressor, PDF merge/split, PDF password protect, PDF to image, image to PDF, bulk watermark, image converter and compressor, background remover, AI upscaler, image to SVG, QR code and barcode generators, QR/barcode reader, favicon generator, video compressor, frame extractor and audio converter. All pay per file, all batch-friendly: [toowl.my.id/en/api](https://toowl.my.id/en/api/).

Questions or a format that fails? Open an issue on the Actor's **Issues** tab.
