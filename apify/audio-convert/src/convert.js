import fs from 'node:fs/promises'
import { ffmpeg, probe, workdir } from './ffmpeg.js'

export const FORMATS = {
  mp3: { ext: 'mp3', mime: 'audio/mpeg', codec: ['-c:a', 'libmp3lame'], lossy: true },
  m4a: { ext: 'm4a', mime: 'audio/mp4', codec: ['-c:a', 'aac', '-movflags', '+faststart'], lossy: true },
  aac: { ext: 'aac', mime: 'audio/aac', codec: ['-c:a', 'aac'], lossy: true },
  ogg: { ext: 'ogg', mime: 'audio/ogg', codec: ['-c:a', 'libvorbis'], lossy: true },
  opus: { ext: 'opus', mime: 'audio/ogg; codecs=opus', codec: ['-c:a', 'libopus'], lossy: true },
  wav: { ext: 'wav', mime: 'audio/wav', codec: ['-c:a', 'pcm_s16le'], lossy: false },
  flac: { ext: 'flac', mime: 'audio/flac', codec: ['-c:a', 'flac'], lossy: false },
}

/**
 * Converts one audio (or the sound track of a video). Optional trim, mono,
 * sample rate, fades, silence trimming and EBU R128 loudness normalisation.
 */
export async function convertAudio(bytes, opt) {
  const fmt = FORMATS[opt.format] ?? FORMATS.mp3
  const w = await workdir()
  try {
    const src = w.file('in')
    await fs.writeFile(src, bytes)
    const info = await probe(src)
    if (!info.audio) throw new Error('No audio stream found.')

    const start = Math.max(0, Number(opt.start) || 0)
    const end = Number(opt.end) || 0
    const args = []
    if (start) args.push('-ss', String(start))
    args.push('-i', src)
    if (end > start) args.push('-t', String(end - start))
    args.push('-vn', '-sn', '-dn')

    const filters = []
    if (opt.trimSilence) {
      // Leading and trailing silence below -50 dB.
      filters.push('silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.1', 'areverse', 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.1', 'areverse')
    }
    if (opt.normalize) filters.push(`loudnorm=I=${opt.loudness ?? -16}:TP=-1.5:LRA=11`)
    const length = (end > start ? end - start : info.duration - start) || 0
    if (opt.fadeIn > 0) filters.push(`afade=t=in:st=0:d=${opt.fadeIn}`)
    if (opt.fadeOut > 0 && length > opt.fadeOut && !opt.trimSilence) filters.push(`afade=t=out:st=${Math.max(0, length - opt.fadeOut)}:d=${opt.fadeOut}`)
    if (filters.length) args.push('-af', filters.join(','))

    if (opt.mono) args.push('-ac', '1')
    else if (fmt.ext === 'opus' || (info.audio.channels ?? 2) > 2) args.push('-ac', String(Math.min(2, info.audio.channels || 2)))
    // Opus only takes 48 kHz; loudnorm resamples to 192 kHz internally, so pin the rate.
    const rate = fmt.ext === 'opus' ? 48000 : Number(opt.sampleRate) || (opt.normalize ? info.audio.sampleRate || 44100 : 0)
    if (rate) args.push('-ar', String(Math.min(rate, fmt.ext === 'mp3' ? 48000 : rate)))

    args.push(...fmt.codec)
    if (fmt.lossy) args.push('-b:a', `${opt.bitrate || 192}k`)
    if (!opt.keepMetadata) args.push('-map_metadata', '-1')
    const out = w.file(`out.${fmt.ext}`)
    args.push(out)
    await ffmpeg(args)
    const result = await probe(out)
    return {
      output: await fs.readFile(out),
      ext: fmt.ext,
      mime: fmt.mime,
      duration: Math.round((result.duration || 0) * 100) / 100,
      sourceDuration: Math.round(info.duration * 100) / 100,
      inputCodec: info.audio.codec,
      channels: result.audio?.channels ?? null,
      sampleRate: result.audio?.sampleRate ?? null,
    }
  } finally {
    await w.cleanup()
  }
}
