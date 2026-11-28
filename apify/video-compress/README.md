# Video Compressor & Converter — MP4, WebM, MOV, GIF in bulk

Compress and convert videos in bulk from URLs. Shrink an **MP4 for email, WhatsApp or your website**, turn **MOV, AVI, MKV or WebM into MP4**, make a **WebM (VP9)** for the web, resize to **1080p / 720p / 480p**, trim, mute, or make an **animated GIF** — hundreds of videos per run.

Runs ffmpeg inside the Actor: no third-party API, your files go nowhere else.

## Features

- **Constant-quality compression** (x264 CRF / VP9 CRF): three levels — high quality, balanced, smallest file.
- **Convert** to MP4 (H.264 + AAC, plays everywhere), WebM (VP9 + Opus), MOV, MKV or GIF.
- **Resize** by capping the short side (2160p … 360p). Never upscales. Phone rotation is applied.
- **Trim** with start/end seconds, **cap the frame rate**, **remove audio**.
- **Fast start** MP4 (plays while downloading).
- **Privacy**: GPS, device and date metadata removed by default.
- If a small, already-efficient MP4 would come out bigger, you get the original back.
- **Pay per minute of output video.** Failed files are free.

## Input

```json
{
  "files": [
    { "url": "https://example.com/IMG_1234.MOV" },
    { "url": "https://example.com/webinar.mp4" }
  ],
  "format": "mp4",
  "quality": "medium",
  "resolution": "720p"
}
```

| Field | Default | Notes |
| --- | --- | --- |
| `files` | — | Video URLs (MP4, MOV, MKV, WebM, AVI, M4V, 3GP, FLV, WMV, TS…) |
| `format` | `mp4` | `mp4`, `webm`, `mov`, `mkv`, `gif` |
| `quality` | `medium` | `high`, `medium`, `small` |
| `resolution` | `original` | `2160p`, `1440p`, `1080p`, `720p`, `480p`, `360p` |
| `fps` | — | Max frame rate (GIF default 12) |
| `removeAudio` | false | |
| `trimStart`, `trimEnd` | — | Seconds |
| `gifWidth` | 480 | GIF only |
| `keepMetadata` | false | |
| `maxFileSizeMb` | 500 | Give the run more memory for very large files |

## Output

Videos go to the run's key-value store; the dataset has one row per file:

```json
{
  "url": "https://example.com/IMG_1234.MOV",
  "name": "IMG_1234.MOV",
  "downloadUrl": "https://api.apify.com/v2/key-value-stores/…/records/0001-IMG_1234.mp4",
  "outputFormat": "mp4",
  "duration": 42.5,
  "minutes": 1,
  "widthBefore": 1920, "heightBefore": 1080,
  "width": 1280, "height": 720,
  "sizeBefore": 84211903,
  "sizeAfter": 9113302,
  "savedPercent": 89.2
}
```

## Pricing

Pay per event: one `video-minute` per started minute of output video (a 2 min 10 s video = 3). Failed files are free. Cap spending with "Max cost per run". More memory = more CPU = faster runs.

## Integrations

Use it from the Apify API, Zapier, Make, n8n or a webhook: compress every upload in a Drive/Dropbox folder, every new product video, or user uploads before they hit your storage.

## Free browser version

A few videos by hand? [toowl.my.id/en/compress-video](https://toowl.my.id/en/compress-video/) compresses in your browser, free, nothing uploaded.

<!-- toowl-footer -->
## Call it from your code

```bash
curl -X POST "https://api.apify.com/v2/acts/toowl~video-compressor/run-sync-get-dataset-items" \
  -H "Authorization: Bearer $APIFY_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"files":[{"url":"https://example.com/your-file"}]}'
```

The same call works from Python (`apify-client`), JavaScript, Make, Zapier and n8n (Apify app/node or a plain HTTP request).

## Use it from AI agents (MCP)

Add this Actor as a tool to Claude, Cursor, VS Code or any MCP client through Apify's MCP server:

```
https://mcp.apify.com/?actors=toowl/video-compressor
```

The agent can then pass file URLs and read the results itself.

## More toowl file APIs

PDF to Markdown, OCR, Office to PDF, PDF compressor, PDF merge/split, PDF to image, image converter and compressor, background remover, AI upscaler, image to SVG, QR code and barcode generators, QR/barcode reader, favicon generator, video compressor, frame extractor and audio converter. All pay per file, all batch-friendly: [toowl.my.id/en/api](https://toowl.my.id/en/api/).

Questions or a format that fails? Open an issue on the Actor's **Issues** tab.
