import fs from 'node:fs/promises'
import { ffmpeg, probe, workdir } from './ffmpeg.js'

export const FORMATS = {
  jpg: { ext: 'jpg', mime: 'image/jpeg', args: (q) => ['-q:v', String(Math.round(2 + ((100 - q) / 100) * 29))] },
  png: { ext: 'png', mime: 'image/png', args: () => [] },
  webp: { ext: 'webp', mime: 'image/webp', args: (q) => ['-c:v', 'libwebp', '-quality', String(q)] },
}

/**
 * Pulls still frames out of one video:
 *  - interval: one frame every N seconds
 *  - count:    N frames spread evenly over the video
 *  - times:    at the given timestamps (seconds)
 *  - scenes:   at each scene change (threshold 0–1)
 * Each frame is its own ffmpeg seek, except scene detection which scans once.
 */
export async function extractFrames(bytes, opt) {
  const fmt = FORMATS[opt.format] ?? FORMATS.jpg
  const w = await workdir()
  try {
    const src = w.file('in')
    await fs.writeFile(src, bytes)
    const info = await probe(src)
    if (!info.video) throw new Error('No video stream found.')
    const duration = info.duration || 0
    const max = Math.max(1, Math.min(opt.maxFrames ?? 100, 1000))
    const scale = opt.width ? [`scale=${opt.width}:-2:flags=lanczos`] : []
    const quality = Math.min(100, Math.max(1, opt.quality ?? 85))
    const frames = []

    if (opt.mode === 'scenes') {
      const vf = [`select='eq(n\\,0)+gt(scene\\,${opt.sceneThreshold ?? 0.3})'`, ...scale].join(',')
      await ffmpeg(['-i', src, '-vf', vf, '-fps_mode', 'vfr', '-frames:v', String(max), ...fmt.args(quality), w.file(`f%05d.${fmt.ext}`)])
      const names = (await fs.readdir(w.dir)).filter((n) => n.startsWith('f')).sort()
      for (const n of names) frames.push({ time: null, output: await fs.readFile(w.file(n)) })
    } else {
      let times
      if (opt.mode === 'times') {
        times = (opt.times ?? []).map(Number).filter((t) => t >= 0 && t <= duration)
      } else if (opt.mode === 'count') {
        const n = Math.min(max, Math.max(1, opt.count ?? 10))
        times = Array.from({ length: n }, (_, i) => ((i + 0.5) * duration) / n)
      } else {
        const step = Math.max(0.04, Number(opt.interval) || 1)
        times = []
        for (let t = 0; t < duration && times.length < max; t += step) times.push(t)
      }
      times = times.slice(0, max)
      for (const [i, t] of times.entries()) {
        const out = w.file(`t${i}.${fmt.ext}`)
        // Seeking before -i is fast (keyframe), then exact to the frame.
        await ffmpeg(['-ss', t.toFixed(3), '-i', src, '-frames:v', '1', ...(scale.length ? ['-vf', scale[0]] : []), ...fmt.args(quality), out])
        frames.push({ time: Math.round(t * 1000) / 1000, output: await fs.readFile(out) })
      }
    }
    if (!frames.length) throw new Error('No frames matched (check the timestamps against the video length).')
    return { frames, ext: fmt.ext, mime: fmt.mime, duration: Math.round(duration * 100) / 100, width: info.video.width, height: info.video.height, fps: info.video.fps }
  } finally {
    await w.cleanup()
  }
}
