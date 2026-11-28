# AI Vocal Remover & Stem Splitter — vocals, drums, bass, other

Split songs into stems with the **SCNet** AI source-separation model: **vocals + instrumental** for karaoke tracks and acapellas, or **4 stems** — vocals, drums, bass and other — for remixes, sampling, practice and transcription. In bulk, from URLs.

## Why use it

- **Two modes**: vocals + instrumental, or 4 stems (the instrumental is included too).
- **Any input**: MP3, WAV, FLAC, M4A, OGG, or the sound of a video.
- **MP3, WAV, FLAC or M4A** stems, stereo, 44.1 kHz.
- **Clean joins**: the song is processed in overlapping 11-second windows that fade into each other; *High* quality overlaps 4× instead of 2×.
- **Instrumental = song minus vocals**, so nothing the model is unsure about disappears from the backing track.
- **No third-party API**: the model runs inside the Actor.
- **Pay per audio minute.** Failed files are free.

## Input

```json
{
  "files": [{ "url": "https://example.com/song.mp3" }],
  "mode": "4stems",
  "format": "mp3"
}
```

| Field | Default | Notes |
| --- | --- | --- |
| `files` | — | Song URLs |
| `mode` | `vocals` | `vocals` (vocals + instrumental) or `4stems` |
| `format` | `mp3` | `mp3`, `wav`, `flac`, `m4a` |
| `bitrate` | 256 | kbps, for MP3/M4A |
| `quality` | `normal` | `high` = 4× overlap, twice the time, same price |
| `trimStart`, `trimEnd` | — | Seconds |
| `maxMinutes` | 20 | Longer songs are skipped (not charged) |

## Output

```json
{
  "url": "https://example.com/song.mp3",
  "name": "song.mp3",
  "mode": "4stems",
  "duration": 214.3,
  "minutes": 4,
  "vocalsUrl": "https://api.apify.com/v2/key-value-stores/…/records/0001-song-vocals.mp3",
  "instrumentalUrl": "…-instrumental.mp3",
  "drumsUrl": "…-drums.mp3",
  "bassUrl": "…-bass.mp3",
  "otherUrl": "…-other.mp3"
}
```

## Speed and memory

The model runs on CPU: give the run **4 GB or more** (more memory = more CPU on Apify). Expect roughly real time to 2× real time per song at 4 GB.

## Pricing

Pay per event: one **audio minute** per started minute of each song, whichever mode. Cap any run with "Max cost per run".

## Rights

Only separate music you own or have the rights to use.

## Free browser version

One song? [toowl.my.id/tools/vocal-remover](https://toowl.my.id/tools/vocal-remover/) runs the same model free in your browser.

<!-- toowl-footer -->
## Call it from your code

```bash
curl -X POST "https://api.apify.com/v2/acts/toowl~ai-vocal-remover-stem-splitter/run-sync-get-dataset-items" \
  -H "Authorization: Bearer $APIFY_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"files":[{"url":"https://example.com/song.mp3"}],"mode":"vocals"}'
```

The same call works from Python (`apify-client`), JavaScript, Make, Zapier and n8n (Apify app/node or a plain HTTP request).

## Use it from AI agents (MCP)

Add this Actor as a tool to Claude, Cursor, VS Code or any MCP client through Apify's MCP server:

```
https://mcp.apify.com/?actors=toowl/ai-vocal-remover-stem-splitter
```

The agent can then pass file URLs and read the results itself.

## More toowl file APIs

Speech to text & subtitles, AI vocal remover, text to speech, AI object remover, PDF to Markdown, PDF to Word & Excel, HTML/URL to PDF, OCR, Office to PDF, PDF compressor, PDF merge/split, PDF password protect, PDF to image, image to PDF, bulk watermark, image converter and compressor, background remover, AI upscaler, image to SVG, QR code and barcode generators, QR/barcode reader, favicon generator, video compressor, frame extractor and audio converter. All pay per file, all batch-friendly: [toowl.my.id/en/api](https://toowl.my.id/en/api/).

Questions or a format that fails? Open an issue on the Actor's **Issues** tab.
