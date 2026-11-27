# Audio Converter — MP3, M4A, WAV, OGG, Opus, FLAC in bulk

Convert audio in bulk from URLs: **WAV to MP3**, **M4A to MP3**, **FLAC to MP3**, **OGG/Opus/AMR/WMA** to anything, or **extract the MP3 from a video** (MP4, MOV, WebM). Trim, mix to mono, change the sample rate, fade in/out, cut silence and **normalise loudness** so every file plays at the same volume.

Runs ffmpeg inside the Actor: no third-party API.

## Features

- **Out**: MP3, M4A (AAC), WAV (16-bit), OGG Vorbis, Opus, FLAC, raw AAC.
- **In**: MP3, WAV, FLAC, M4A, AAC, OGG, Opus, AMR, WMA, AIFF, and the sound track of MP4, MOV, WebM, MKV, AVI…
- **Bitrate** 64–320 kbps, **sample rate** 8–48 kHz, **mono**.
- **EBU R128 loudness normalisation** (-16 LUFS podcasts, -14 streaming, -23 broadcast).
- **Trim**, **fade in/out**, **remove leading/trailing silence**.
- Speech-to-text prep: `16000` Hz + mono + WAV/FLAC.
- **Pay per file.** Failed files are free.

## Input

```json
{
  "files": [
    { "url": "https://example.com/interview.wav" },
    { "url": "https://example.com/clip.mp4" }
  ],
  "format": "mp3",
  "bitrate": 128,
  "mono": true,
  "normalize": true
}
```

| Field | Default | Notes |
| --- | --- | --- |
| `files` | — | Audio or video URLs |
| `format` | `mp3` | `mp3`, `m4a`, `wav`, `ogg`, `opus`, `flac`, `aac` |
| `bitrate` | 192 | kbps, lossy formats |
| `sampleRate` | original | 8000–48000 |
| `mono` | false | |
| `normalize` | false | Loudness normalisation |
| `loudness` | -16 | Target LUFS |
| `trimSilence` | false | Leading and trailing |
| `trimStart`, `trimEnd` | — | Seconds |
| `fadeIn`, `fadeOut` | — | Seconds |
| `keepMetadata` | false | Title, artist, cover |
| `maxFileSizeMb` | 300 | |

## Output

```json
{
  "url": "https://example.com/interview.wav",
  "name": "interview.wav",
  "downloadUrl": "https://api.apify.com/v2/key-value-stores/…/records/0001-interview.mp3",
  "inputCodec": "pcm_s16le",
  "outputFormat": "mp3",
  "duration": 1834.2,
  "channels": 1,
  "sampleRate": 44100,
  "sizeBefore": 323559840,
  "sizeAfter": 29347112
}
```

## Pricing

Pay per event: one `audio-converted` per file, whatever its length. Failed files are free.

## Free browser version

[toowl.my.id/en/compress-audio](https://toowl.my.id/en/compress-audio/) converts and compresses audio in your browser, free.

<!-- toowl-footer -->
## Call it from your code

```bash
curl -X POST "https://api.apify.com/v2/acts/toowl~audio-converter/run-sync-get-dataset-items" \
  -H "Authorization: Bearer $APIFY_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"files":[{"url":"https://example.com/your-file"}]}'
```

The same call works from Python (`apify-client`), JavaScript, Make, Zapier and n8n (Apify app/node or a plain HTTP request).

## Use it from AI agents (MCP)

Add this Actor as a tool to Claude, Cursor, VS Code or any MCP client through Apify's MCP server:

```
https://mcp.apify.com/?actors=toowl/audio-converter
```

The agent can then pass file URLs and read the results itself.

## More toowl file APIs

PDF to Markdown, OCR, Office to PDF, PDF compressor, PDF merge/split, PDF to image, image converter and compressor, background remover, AI upscaler, image to SVG, QR/barcode reader, video compressor, frame extractor and audio converter. All pay per file, all batch-friendly: [toowl.my.id/en/api](https://toowl.my.id/en/api/).

Questions or a format that fails? Open an issue on the Actor's **Issues** tab.
