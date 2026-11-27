# Video Frame Extractor & Thumbnail Maker — bulk

Extract still frames from videos in bulk from URLs: **one every N seconds**, **N evenly spaced thumbnails**, **exact timestamps**, or **one per scene change**. JPG, PNG or WebP, resized if you like. Built for **AI vision datasets**, video previews, thumbnails and content moderation.

Runs ffmpeg inside the Actor: no third-party API.

## Modes

| `mode` | What you get |
| --- | --- |
| `interval` | One frame every `interval` seconds (0.5 = two a second) |
| `count` | `count` frames spread evenly over the video — thumbnails/storyboard |
| `times` | Frames at `timestamps`, e.g. `[0, 12.5, 60]` |
| `scenes` | A frame at each scene change (`sceneThreshold`, lower = more) |

## Input

```json
{
  "files": [{ "url": "https://example.com/ad.mp4" }],
  "mode": "count",
  "count": 6,
  "format": "webp",
  "width": 640
}
```

| Field | Default | Notes |
| --- | --- | --- |
| `files` | — | Video URLs |
| `mode` | `interval` | `interval`, `count`, `times`, `scenes` |
| `interval` | 1 | Seconds |
| `count` | 10 | |
| `timestamps` | — | Seconds |
| `sceneThreshold` | 0.3 | 0.05–0.9 |
| `maxFrames` | 100 | Per video, up to 1000 |
| `format` | `jpg` | `jpg`, `png`, `webp` |
| `quality` | 85 | JPG/WebP |
| `width` | original | px, height keeps the ratio |
| `maxFileSizeMb` | 500 | |

## Output

Frames go to the run's key-value store; one dataset row per video with every frame's time and link:

```json
{
  "url": "https://example.com/ad.mp4",
  "name": "ad.mp4",
  "frameCount": 6,
  "firstFrame": "https://api.apify.com/v2/key-value-stores/…/records/0001-ad-0001.webp",
  "frames": [
    { "time": 2.5, "url": "https://api.apify.com/v2/key-value-stores/…/records/0001-ad-0001.webp" },
    { "time": 7.5, "url": "https://api.apify.com/v2/key-value-stores/…/records/0001-ad-0002.webp" }
  ],
  "duration": 30.03,
  "width": 1920,
  "height": 1080,
  "fps": 29.97
}
```

## Pricing

Pay per event: one `video-processed` per video, however many frames. Failed videos are free.

## Free browser version

[toowl.my.id/en/extract-frames](https://toowl.my.id/en/extract-frames/) pulls frames from a video in your browser, free.
