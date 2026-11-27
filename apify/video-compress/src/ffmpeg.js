// Shared by the toowl media Actors (copied into each Actor's src/ by
// `node apify/sync-shared.mjs` — edit this file, not the copies).
//
// Thin wrappers over the ffmpeg/ffprobe binaries installed in the Docker
// image: a temp folder per file, ffprobe as JSON, ffmpeg with its error tail.

import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

/** Runs a command; resolves with stdout, rejects with the last lines of stderr. */
export function exec(cmd, args, { timeoutMs = 60 * 60_000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    const out = []
    let err = ''
    child.stdout.on('data', (d) => out.push(d))
    child.stderr.on('data', (d) => {
      err = (err + d).slice(-8000)
    })
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs)
    child.on('error', (e) => {
      clearTimeout(timer)
      reject(e)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) resolve(Buffer.concat(out))
      else {
        const lines = err.trim().split('\n').filter((l) => !/^\s*(frame=|size=|Press \[q\])/.test(l))
        reject(new Error(lines.slice(-3).join(' | ') || `${cmd} exited with code ${code}`))
      }
    })
  })
}

/** A fresh temp folder for one file; call `cleanup()` when done. */
export async function workdir() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'toowl-'))
  return { dir, file: (name) => path.join(dir, name), cleanup: () => fs.rm(dir, { recursive: true, force: true }) }
}

/** ffprobe → { duration, video: {width,height,fps,codec} | null, audio: {codec,channels,sampleRate} | null, format } */
export async function probe(file) {
  const json = JSON.parse(
    (await exec('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file])).toString(),
  )
  const streams = json.streams ?? []
  const v = streams.find((s) => s.codec_type === 'video' && !s.disposition?.attached_pic)
  const a = streams.find((s) => s.codec_type === 'audio')
  const rate = (r) => {
    const [n, d] = String(r || '0/1').split('/').map(Number)
    return d ? Math.round((n / d) * 100) / 100 : 0
  }
  // Phones record portrait video as landscape plus a rotation tag.
  const rot = Math.abs(Number(v?.tags?.rotate ?? v?.side_data_list?.find((s) => s.rotation != null)?.rotation ?? 0)) % 180
  return {
    duration: Number(json.format?.duration ?? v?.duration ?? a?.duration ?? 0),
    format: json.format?.format_name ?? '',
    video: v
      ? {
          width: rot === 90 ? v.height : v.width,
          height: rot === 90 ? v.width : v.height,
          fps: rate(v.avg_frame_rate || v.r_frame_rate),
          codec: v.codec_name,
        }
      : null,
    audio: a ? { codec: a.codec_name, channels: a.channels, sampleRate: Number(a.sample_rate) } : null,
  }
}

export const ffmpeg = (args, opts) => exec('ffmpeg', ['-hide_banner', '-nostdin', '-y', ...args], opts)

/** Whole minutes started (min 1): the unit the media Actors charge by. */
export const startedMinutes = (seconds) => Math.max(1, Math.ceil((seconds || 0) / 60 - 1e-9))
