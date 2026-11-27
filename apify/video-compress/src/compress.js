import fs from 'node:fs/promises'
import { ffmpeg, probe, workdir } from './ffmpeg.js'

export const FORMATS = {
  mp4: { ext: 'mp4', mime: 'video/mp4' },
  webm: { ext: 'webm', mime: 'video/webm' },
  mov: { ext: 'mov', mime: 'video/quicktime' },
  mkv: { ext: 'mkv', mime: 'video/x-matroska' },
  gif: { ext: 'gif', mime: 'image/gif' },
}

// Constant-quality targets per level: x264 CRF, VP9 CRF.
const LEVELS = {
  high: { h264: 23, vp9: 33, audio: '160k' },
  medium: { h264: 27, vp9: 37, audio: '128k' },
  small: { h264: 31, vp9: 41, audio: '96k' },
}

/** "1080p" → 1080; "original" → 0. Height of a landscape video, short side otherwise. */
const shortSide = (r) => (r && r !== 'original' ? parseInt(r, 10) || 0 : 0)

/**
 * Re-encodes one video. Never upscales; keeps the aspect ratio, rotation
 * (applied), and the frame rate unless `fps` caps it.
 */
export async function compressVideo(bytes, opt) {
  const fmt = FORMATS[opt.format] ?? FORMATS.mp4
  const level = LEVELS[opt.quality] ?? LEVELS.medium
  const w = await workdir()
  try {
    const src = w.file('in')
    await fs.writeFile(src, bytes)
    const info = await probe(src)
    if (!info.video) throw new Error('No video stream found (is this an audio file?).')

    const start = Math.max(0, Number(opt.start) || 0)
    const end = Number(opt.end) || 0
    const args = []
    if (start) args.push('-ss', String(start))
    args.push('-i', src)
    if (end > start) args.push('-t', String(end - start))

    // Scale the short side down to the target (even sizes for the encoders).
    const filters = []
    const target = shortSide(opt.resolution)
    const { width: W, height: H } = info.video
    if (target && Math.min(W, H) > target) {
      filters.push(W >= H ? `scale=-2:${target}` : `scale=${target}:-2`)
    }
    const fps = Number(opt.fps) || 0
    if (opt.format === 'gif') {
      const gfps = fps || 12
      const gw = Math.min(target ? (W >= H ? Math.round((target * W) / H) : target) : W, opt.gifWidth || 480)
      args.push(
        '-vf',
        `fps=${gfps},scale=${gw}:-2:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`,
        '-an',
        '-loop',
        '0',
      )
    } else {
      if (fps && info.video.fps > fps) filters.push(`fps=${fps}`)
      if (filters.length) args.push('-vf', filters.join(','))
      if (opt.format === 'webm') {
        args.push('-c:v', 'libvpx-vp9', '-crf', String(level.vp9), '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '4')
        args.push(...(opt.removeAudio || !info.audio ? ['-an'] : ['-c:a', 'libopus', '-b:a', level.audio]))
      } else {
        args.push('-c:v', 'libx264', '-crf', String(level.h264), '-preset', opt.preset || 'veryfast', '-pix_fmt', 'yuv420p')
        if (opt.format !== 'mkv') args.push('-movflags', '+faststart')
        args.push(...(opt.removeAudio || !info.audio ? ['-an'] : ['-c:a', 'aac', '-b:a', level.audio]))
      }
      if (!opt.keepMetadata) args.push('-map_metadata', '-1')
    }
    const out = w.file(`out.${fmt.ext}`)
    args.push(out)
    await ffmpeg(args)
    const result = await probe(out)
    let output = await fs.readFile(out)

    // A small, already-efficient file can come out bigger: keep the original then.
    let keptOriginal = false
    if (opt.format === 'mp4' && !target && !fps && !start && !end && output.length >= bytes.length && /mp4|mov/.test(info.format)) {
      output = bytes
      keptOriginal = true
    }
    return {
      output,
      ext: fmt.ext,
      mime: fmt.mime,
      duration: Math.round((result.duration || info.duration) * 100) / 100,
      sourceDuration: Math.round(info.duration * 100) / 100,
      widthBefore: info.video.width,
      heightBefore: info.video.height,
      width: result.video?.width ?? null,
      height: result.video?.height ?? null,
      inputCodec: info.video.codec,
      keptOriginal,
    }
  } finally {
    await w.cleanup()
  }
}
