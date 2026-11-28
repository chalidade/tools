# Speech to Text & Subtitles — Whisper, 99 languages

Transcribe audio and video files from URLs with **OpenAI Whisper**: the full text, timestamped segments, and ready-to-use **SRT and VTT subtitles**. Podcasts, interviews, meetings, lectures, YouTube-style videos, voice notes — in bulk, through the API or on a schedule.

## Why use it

- **Any file**: MP3, WAV, M4A, AAC, OGG, Opus, FLAC, and the sound of MP4, MOV, WebM or MKV videos.
- **99 languages** with auto-detect (English, Indonesian, Spanish, French, German, Portuguese, Arabic, Hindi, Chinese, Japanese…).
- **Subtitles that read well**: long segments are split at punctuation into two-line cues of about 42 characters.
- **Text, SRT, VTT and JSON** files saved per input, plus the text and segments right in the dataset.
- **Long audio** is handled window by window (Whisper's own long-form method), with silence skipped so lines start on time.
- **No third-party API**: Whisper runs inside the Actor; your audio is not sent to OpenAI or anyone else.
- **Pay per audio minute.** Failed files are free.

## Input

```json
{
  "files": [{ "url": "https://example.com/interview.mp3" }],
  "language": "auto",
  "outputFormats": ["txt", "srt", "vtt"]
}
```

| Field | Default | Notes |
| --- | --- | --- |
| `files` | — | Audio or video URLs |
| `language` | `auto` | Any Whisper code (`en`, `id`, `es`, `sw`, …) or `auto` |
| `outputFormats` | `["txt","srt"]` | `txt`, `srt`, `vtt`, `json` |
| `includeSegments` | true | Timed segments in the dataset row |
| `trimStart`, `trimEnd` | — | Seconds: transcribe only part of a file |
| `maxMinutes` | — | Skip longer files (not charged) |

## Output

```json
{
  "url": "https://example.com/interview.mp3",
  "name": "interview.mp3",
  "language": "en",
  "duration": 6.7,
  "minutes": 1,
  "text": "Hello, this is toowl. We turn text into natural speech, and it runs on a plain CPU without any cloud service.",
  "segments": [{ "start": 0, "end": 6.4, "text": "Hello, this is toowl. We turn text into natural speech, …" }],
  "txtUrl": "https://api.apify.com/v2/key-value-stores/…/records/0001-interview.txt",
  "srtUrl": "https://api.apify.com/v2/key-value-stores/…/records/0001-interview.srt"
}
```

## Model and accuracy

Whisper **base** (multilingual, 8-bit quantized, CPU). It is accurate on clear speech in widely spoken languages, and fast and cheap. For heavy accents, noisy recordings or rare languages, a larger Whisper model will do better; check a sample first.

## Pricing

Pay per event: one **audio minute** per started minute of each file (a 2 min 10 s file = 3 minutes). Cap any run with "Max cost per run".

## Free browser version

Transcribing one file? [toowl.my.id/tools/transkrip](https://toowl.my.id/tools/transkrip/) runs the same engine free in your browser — nothing uploaded.

<!-- toowl-footer -->
## Call it from your code

```bash
curl -X POST "https://api.apify.com/v2/acts/toowl~speech-to-text-whisper/run-sync-get-dataset-items" \
  -H "Authorization: Bearer $APIFY_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"files":[{"url":"https://example.com/interview.mp3"}],"language":"auto","outputFormats":["txt","srt"]}'
```

The same call works from Python (`apify-client`), JavaScript, Make, Zapier and n8n (Apify app/node or a plain HTTP request).

## Use it from AI agents (MCP)

Add this Actor as a tool to Claude, Cursor, VS Code or any MCP client through Apify's MCP server:

```
https://mcp.apify.com/?actors=toowl/speech-to-text-whisper
```

The agent can then pass file URLs and read the results itself.

## More toowl file APIs

Speech to text & subtitles, AI vocal remover, text to speech, AI object remover, PDF to Markdown, PDF to Word & Excel, HTML/URL to PDF, OCR, Office to PDF, PDF compressor, PDF merge/split, PDF password protect, PDF to image, image to PDF, bulk watermark, image converter and compressor, background remover, AI upscaler, image to SVG, QR code and barcode generators, QR/barcode reader, favicon generator, video compressor, frame extractor and audio converter. All pay per file, all batch-friendly: [toowl.my.id/en/api](https://toowl.my.id/en/api/).

Questions or a format that fails? Open an issue on the Actor's **Issues** tab.
