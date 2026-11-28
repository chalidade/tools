# Text to Speech MP3 — neural English voice + 100+ languages

Turn texts into speech files in bulk: **MP3, M4A, OGG, Opus, WAV or FLAC**. A natural-sounding **English neural voice** (Piper "Joe"), and **eSpeak NG** voices for **100+ languages** including Indonesian, Spanish, German, French, Arabic, Hindi and Japanese. Narration, e-learning, IVR prompts, accessibility, video voice-overs, language drills.

## Why use it

- **Bulk**: one file per text, all bundled into one ZIP too.
- **Long texts**: up to 100,000 characters each, read sentence by sentence with natural pauses between sentences and paragraphs.
- **Voices**: Joe (neural, natural English), English male/female and four Indonesian voices (eSpeak), or any eSpeak voice code (`de`, `es+f3`, `fr+m1`, `ar`, `hi`, `ja`, …).
- **Speed and pitch** control; output normalized to −1 dBFS.
- **No third-party API, no cloud TTS bill**: everything runs inside the Actor.
- **Pay per 1,000 characters.** Failed texts are free.

## Input

```json
{
  "texts": [
    "Welcome to our store. Today every order ships free.",
    { "text": "Selamat datang di toko kami.", "voice": "id-f", "name": "welcome-id" }
  ],
  "voice": "en-neural",
  "format": "mp3"
}
```

| Field | Default | Notes |
| --- | --- | --- |
| `texts` | — | Strings, or objects `{ text, name, voice, espeakVoice }` |
| `voice` | `en-neural` | `en-neural`, `en-m`, `en-f`, `id-m`, `id-f`, `id-m2`, `id-f2` |
| `espeakVoice` | — | Any eSpeak NG voice; overrides `voice` |
| `speed` | 1 | 0.5–2 |
| `pitch` | 50 | 0–99 (eSpeak voices) |
| `format` | `mp3` | `mp3`, `m4a`, `ogg`, `opus`, `wav`, `flac` |
| `bitrate` | 128 | kbps |

## Output

```json
{
  "name": "welcome-id",
  "voice": "id-f",
  "characters": 28,
  "duration": 2.4,
  "format": "mp3",
  "downloadUrl": "https://api.apify.com/v2/key-value-stores/…/records/0002-welcome-id.mp3"
}
```

## Voice quality

Joe is a neural (VITS) voice and sounds natural. eSpeak NG voices are formant synthesis: very clear and fast, but recognizably synthetic — good for prompts, drills and drafts.

## Pricing

Pay per event: one event per started **1,000 characters** of each text. Cap any run with "Max cost per run".

## Free browser version

[toowl.my.id/tools/text-to-speech](https://toowl.my.id/tools/text-to-speech/) — the same voices free in your browser.

<!-- toowl-footer -->
## Call it from your code

```bash
curl -X POST "https://api.apify.com/v2/acts/toowl~text-to-speech-mp3/run-sync-get-dataset-items" \
  -H "Authorization: Bearer $APIFY_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"texts":["Welcome to our store."],"voice":"en-neural","format":"mp3"}'
```

The same call works from Python (`apify-client`), JavaScript, Make, Zapier and n8n (Apify app/node or a plain HTTP request).

## Use it from AI agents (MCP)

Add this Actor as a tool to Claude, Cursor, VS Code or any MCP client through Apify's MCP server:

```
https://mcp.apify.com/?actors=toowl/text-to-speech-mp3
```

The agent can then pass file URLs and read the results itself.

## More toowl file APIs

Speech to text & subtitles, AI vocal remover, text to speech, AI object remover, PDF to Markdown, PDF to Word & Excel, HTML/URL to PDF, OCR, Office to PDF, PDF compressor, PDF merge/split, PDF password protect, PDF to image, image to PDF, bulk watermark, image converter and compressor, background remover, AI upscaler, image to SVG, QR code and barcode generators, QR/barcode reader, favicon generator, video compressor, frame extractor and audio converter. All pay per file, all batch-friendly: [toowl.my.id/en/api](https://toowl.my.id/en/api/).

Questions or a format that fails? Open an issue on the Actor's **Issues** tab.
