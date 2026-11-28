// Whisper speech recognition on ONNX Runtime Web, written for this site so
// it needs no extra runtime: the encoder turns 30 s of log-mel features into
// audio states, the merged decoder (with its key/value cache) writes tokens
// one at a time. Long audio is read window by window, each one starting where
// the last complete segment ended (OpenAI's sequential long-form decoding),
// with timestamp tokens giving the segment times.
//
// Kept free of DOM and bundler specifics so it runs in a worker and in Node.

import type { InferenceSession, Tensor } from 'onnxruntime-web'
import { FRAMES, logMel, MELS, RATE, WINDOW } from './mel'

type Ort = { InferenceSession: typeof InferenceSession; Tensor: typeof Tensor }

export interface ModelSpec {
  layers: number
  heads: number
  /** d_model / heads */
  headDim: number
}

export const SPECS: Record<'tiny' | 'base', ModelSpec> = {
  tiny: { layers: 4, heads: 6, headDim: 64 },
  base: { layers: 6, heads: 8, headDim: 64 },
}

// Special tokens of the multilingual Whisper vocabulary.
const EOT = 50257
const SOT = 50258
const LANG_FIRST = 50259
const LANG_LAST = 50357
const TRANSCRIBE = 50359
const NO_SPEECH = 50362
const NO_TIMESTAMPS = 50363
const TS_BEGIN = 50364
const MAX_TOKENS = 448
/** The first timestamp may be at most 1 s into the window. */
const MAX_INITIAL_TS = 50
const SECONDS_PER_TS = 0.02

export const LANGS: Record<string, number> = { id: 50275, en: 50259, ms: 50282, jw: 50356, su: 50357 }

// From the model's generation_config: tokens never emitted (mostly symbols that are not speech).
const SUPPRESS = [
  1, 2, 7, 8, 9, 10, 14, 25, 26, 27, 28, 29, 31, 58, 59, 60, 61, 62, 63, 90, 91, 92, 93, 359, 503, 522, 542, 873, 893, 902, 918, 922, 931,
  1350, 1853, 1982, 2460, 2627, 3246, 3253, 3268, 3536, 3846, 3961, 4183, 4667, 6585, 6647, 7273, 9061, 9383, 10428, 10929, 11938, 12033,
  12331, 12562, 13793, 14157, 14635, 15265, 15618, 16553, 16604, 18362, 18956, 20075, 21675, 22520, 26130, 26161, 26435, 28279, 29464,
  31650, 32302, 32470, 36865, 42863, 47425, 49870, 50254,
]

export interface Segment {
  start: number
  end: number
  text: string
}

export interface TranscribeOptions {
  /** A key of LANGS, or 'auto' to detect it from the first window. */
  language: string
  signal?: AbortSignal
  /** Fraction done (0–1) and the segments so far. */
  onProgress?: (done: number, segments: Segment[]) => void
  onLanguage?: (code: string) => void
}

export class Canceled extends Error {
  name = 'AbortError'
}

/** Byte-level BPE decoding: GPT-2's printable stand-ins back to bytes, then UTF-8. */
export class Tokenizer {
  private pieces: string[] = []
  private byteOf = new Map<string, number>()

  constructor(vocab: Record<string, number>) {
    for (const [piece, id] of Object.entries(vocab)) this.pieces[id] = piece
    const bs: number[] = []
    for (let b = 33; b <= 126; b++) bs.push(b)
    for (let b = 161; b <= 172; b++) bs.push(b)
    for (let b = 174; b <= 255; b++) bs.push(b)
    const cs = [...bs]
    let n = 0
    for (let b = 0; b < 256; b++)
      if (!bs.includes(b)) {
        bs.push(b)
        cs.push(256 + n++)
      }
    bs.forEach((b, i) => this.byteOf.set(String.fromCharCode(cs[i]), b))
  }

  decode(ids: number[]): string {
    const bytes: number[] = []
    for (const id of ids) {
      if (id >= EOT) continue
      for (const ch of this.pieces[id] ?? '') bytes.push(this.byteOf.get(ch) ?? 32)
    }
    return new TextDecoder().decode(new Uint8Array(bytes))
  }
}

export class Whisper {
  private ort: Ort
  private encoder: InferenceSession
  private decoder: InferenceSession
  private spec: ModelSpec
  private tokenizer: Tokenizer

  private constructor(ort: Ort, encoder: InferenceSession, decoder: InferenceSession, spec: ModelSpec, tokenizer: Tokenizer) {
    this.ort = ort
    this.encoder = encoder
    this.decoder = decoder
    this.spec = spec
    this.tokenizer = tokenizer
  }

  static async create(ort: Ort, encoder: Uint8Array, decoder: Uint8Array, vocab: Record<string, number>, spec: ModelSpec, ep: string[] = ['wasm']) {
    const opts = { executionProviders: ep, graphOptimizationLevel: 'all' as const }
    const enc = await ort.InferenceSession.create(encoder, opts)
    const dec = await ort.InferenceSession.create(decoder, opts)
    return new Whisper(ort, enc, dec, spec, new Tokenizer(vocab))
  }

  async release() {
    await this.encoder.release()
    await this.decoder.release()
  }

  private async encode(audio: Float32Array, start: number) {
    const features = new this.ort.Tensor('float32', logMel(audio, start), [1, MELS, FRAMES])
    const out = await this.encoder.run({ input_features: features }, ['last_hidden_state'])
    return out.last_hidden_state
  }

  private emptyPast() {
    const { layers, heads, headDim } = this.spec
    const feeds: Record<string, Tensor> = {}
    for (let l = 0; l < layers; l++)
      for (const part of ['decoder', 'encoder'])
        for (const kv of ['key', 'value']) feeds[`past_key_values.${l}.${part}.${kv}`] = new this.ort.Tensor('float32', new Float32Array(0), [1, heads, 0, headDim])
    return feeds
  }

  private presentNames(withEncoder: boolean) {
    const names = ['logits']
    for (let l = 0; l < this.spec.layers; l++)
      for (const part of withEncoder ? ['decoder', 'encoder'] : ['decoder'])
        for (const kv of ['key', 'value']) names.push(`present.${l}.${part}.${kv}`)
    return names
  }

  /** Runs the prompt through the decoder: logits of every prompt position plus the cache. */
  private async prompt(states: Tensor, ids: number[]) {
    const feeds = {
      ...this.emptyPast(),
      input_ids: new this.ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
      encoder_hidden_states: states,
      use_cache_branch: new this.ort.Tensor('bool', [false], [1]),
    }
    const out = await this.decoder.run(feeds, this.presentNames(true))
    const past: Record<string, Tensor> = {}
    for (const [k, v] of Object.entries(out)) if (k.startsWith('present.')) past[k.replace('present.', 'past_key_values.')] = v
    return { logits: out.logits, past }
  }

  private async step(states: Tensor, past: Record<string, Tensor>, id: number) {
    const feeds = {
      ...past,
      input_ids: new this.ort.Tensor('int64', BigInt64Array.from([BigInt(id)]), [1, 1]),
      encoder_hidden_states: states,
      use_cache_branch: new this.ort.Tensor('bool', [true], [1]),
    }
    const out = await this.decoder.run(feeds, this.presentNames(false))
    const next = { ...past }
    for (const [k, v] of Object.entries(out)) {
      if (!k.startsWith('present.')) continue
      const name = k.replace('present.', 'past_key_values.')
      next[name]?.dispose?.()
      next[name] = v
    }
    return { logits: out.logits, past: next }
  }

  /** Most likely language of the audio at `start`, as a key of LANGS when it is one, else Whisper's id. */
  async detectLanguage(audio: Float32Array, start = 0): Promise<number> {
    const states = await this.encode(audio, start)
    const { logits } = await this.prompt(states, [SOT])
    const row = logits.data as Float32Array
    let best = LANG_FIRST
    for (let id = LANG_FIRST; id <= LANG_LAST; id++) if (row[id] > row[best]) best = id
    return best
  }

  /** Decodes one window: the tokens after the prompt, and the probability that it holds no speech. */
  private async decodeWindow(states: Tensor, lang: number, temperature: number, maxTs: number, signal?: AbortSignal) {
    const prompt = [SOT, lang, TRANSCRIBE]
    let { logits, past } = await this.prompt(states, prompt)
    const vocab = logits.dims[2]
    const first = (logits.data as Float32Array).subarray(0, vocab)
    const noSpeech = softmaxAt(first, NO_SPEECH)
    let row: Float32Array = (logits.data as Float32Array).slice((prompt.length - 1) * vocab, prompt.length * vocab)
    const tokens: number[] = []
    let logprob = 0
    try {
      while (prompt.length + tokens.length < MAX_TOKENS) {
        if (signal?.aborted) throw new Canceled()
        applyRules(row, tokens, maxTs)
        const id = temperature > 0 ? sample(row, temperature) : argmax(row)
        logprob += logSoftmaxAt(row, id)
        if (id === EOT) break
        tokens.push(id)
        const r = await this.step(states, past, id)
        past = r.past
        row = (r.logits.data as Float32Array).slice(0, vocab)
      }
    } finally {
      for (const t of Object.values(past)) t.dispose?.()
    }
    return { tokens, noSpeech, avgLogprob: logprob / (tokens.length + 1), finished: prompt.length + tokens.length < MAX_TOKENS }
  }

  /** Transcribes 16 kHz mono audio into timed segments. */
  async transcribe(audio: Float32Array, opts: TranscribeOptions): Promise<Segment[]> {
    const segments: Segment[] = []
    let lang = LANGS[opts.language]
    if (!lang) {
      lang = await this.detectLanguage(audio)
      const code = Object.keys(LANGS).find((k) => LANGS[k] === lang)
      opts.onLanguage?.(code ?? 'other')
    }
    let seek = 0
    const quiet = silenceLevel(audio)
    // Ignore a last sliver shorter than 0.2 s: nothing to recognize there.
    while (seek < audio.length - RATE * 0.2) {
      if (opts.signal?.aborted) throw new Canceled()
      // Whisper's first timestamp can be at most 1 s into a window, so a window
      // that opens on a long pause gets its first line too early: skip silence.
      seek = skipSilence(audio, seek, quiet)
      if (seek >= audio.length - RATE * 0.2) break
      const windowLen = Math.min(WINDOW, audio.length - seek)
      const offset = seek / RATE
      const states = await this.encode(audio, seek)
      const maxTs = TS_BEGIN + Math.round(windowLen / RATE / SECONDS_PER_TS)
      // Greedy first; if that loops or reads as garbage, retry with a little randomness.
      let result = await this.decodeWindow(states, lang, 0, maxTs, opts.signal)
      for (const temp of [0.2, 0.4, 0.6, 0.8]) {
        if (result.finished && !repetitive(result.tokens) && result.avgLogprob > -1) break
        const retry = await this.decodeWindow(states, lang, temp, maxTs, opts.signal)
        if (retry.finished || !result.finished) result = retry
      }
      states.dispose?.()
      const { tokens, noSpeech, avgLogprob } = result

      let advance = windowLen
      if (!(noSpeech > 0.6 && avgLogprob < -1)) {
        const found = this.segmentsOf(tokens, offset, windowLen / RATE)
        segments.push(...found.segments)
        if (found.consumed !== null) advance = Math.max(RATE, Math.round(found.consumed * RATE))
      }
      seek += Math.min(advance, windowLen)
      opts.onProgress?.(Math.min(1, seek / audio.length), segments)
    }
    return mergeShort(segments)
  }

  /**
   * Splits a window's tokens at timestamp pairs. `consumed` is how far (in
   * seconds) the window was read up to the last complete segment, or null
   * when the whole window was used.
   */
  private segmentsOf(tokens: number[], offset: number, length: number) {
    const segments: Segment[] = []
    const isTs = (t: number) => t >= TS_BEGIN
    const time = (t: number) => (t - TS_BEGIN) * SECONDS_PER_TS
    const singleEnding = tokens.length >= 2 && isTs(tokens[tokens.length - 1]) && !isTs(tokens[tokens.length - 2])
    const cuts: number[] = []
    for (let i = 1; i < tokens.length; i++) if (isTs(tokens[i]) && isTs(tokens[i - 1])) cuts.push(i)
    const push = (start: number, end: number, ids: number[]) => {
      const text = this.tokenizer.decode(ids).trim()
      if (text) segments.push({ start: offset + start, end: offset + Math.max(end, start), text })
    }
    if (cuts.length) {
      const slices = [...cuts]
      if (singleEnding) slices.push(tokens.length)
      let last = 0
      for (const cut of slices) {
        const part = tokens.slice(last, cut)
        push(time(part[0]), time(part[part.length - 1]), part.filter((t) => !isTs(t)))
        last = cut
      }
      if (singleEnding) return { segments, consumed: null }
      return { segments, consumed: time(tokens[last - 1]) }
    }
    const stamps = tokens.filter(isTs)
    const end = stamps.length && stamps[stamps.length - 1] !== stamps[0] ? time(stamps[stamps.length - 1]) : length
    push(stamps.length ? time(stamps[0]) : 0, end, tokens.filter((t) => !isTs(t)))
    return { segments, consumed: null }
  }
}

const FRAME = RATE / 20 // 50 ms

function rms(audio: Float32Array, at: number) {
  let s = 0
  const end = Math.min(audio.length, at + FRAME)
  for (let i = at; i < end; i++) s += audio[i] * audio[i]
  return Math.sqrt(s / Math.max(1, end - at))
}

/** Loudness below which a 50 ms frame counts as silence: well under the file's typical speech level. */
function silenceLevel(audio: Float32Array) {
  const levels: number[] = []
  for (let at = 0; at < audio.length; at += FRAME * 4) levels.push(rms(audio, at))
  levels.sort((a, b) => a - b)
  const loud = levels[Math.floor(levels.length * 0.9)] ?? 0
  return Math.max(1e-4, loud * 0.03)
}

/** The first point at or after `seek` where sound starts, less a short lead-in. */
function skipSilence(audio: Float32Array, seek: number, quiet: number) {
  let at = seek
  while (at < audio.length && rms(audio, at) < quiet) at += FRAME
  return Math.max(seek, at - RATE * 0.3)
}

/** Whisper's timestamp rules plus suppressed tokens, applied to one row of logits in place. */
function applyRules(row: Float32Array, tokens: number[], maxTs: number) {
  const NEG = -Infinity
  for (const id of SUPPRESS) row[id] = NEG
  for (let id = SOT; id < TS_BEGIN; id++) row[id] = NEG // sot, languages, tasks, no-speech, no-timestamps
  row[NO_TIMESTAMPS] = NEG
  for (let id = maxTs + 1; id < row.length; id++) row[id] = NEG // no timestamps past the audio

  if (tokens.length === 0) {
    row[EOT] = NEG
    row[220] = NEG // a bare space
    for (let id = 0; id < TS_BEGIN; id++) row[id] = NEG // must open with a timestamp…
    for (let id = TS_BEGIN + MAX_INITIAL_TS + 1; id < row.length; id++) row[id] = NEG // …near the start
    return
  }
  const last = tokens[tokens.length - 1]
  const lastWasTs = last >= TS_BEGIN
  const penultimateWasTs = tokens.length < 2 || tokens[tokens.length - 2] >= TS_BEGIN
  if (lastWasTs) {
    if (penultimateWasTs) for (let id = TS_BEGIN; id < row.length; id++) row[id] = NEG // a pair is closed: text or end next
    else for (let id = 0; id < EOT; id++) row[id] = NEG // a segment just ended: its partner timestamp or the end
  }
  // Timestamps never go backwards.
  const stamps = tokens.filter((t) => t >= TS_BEGIN)
  if (stamps.length) {
    const floor = lastWasTs && !penultimateWasTs ? stamps[stamps.length - 1] : stamps[stamps.length - 1] + 1
    for (let id = TS_BEGIN; id < floor; id++) row[id] = NEG
  }
  // When timestamps together are more likely than any single text token, take a timestamp.
  let max = NEG
  for (let id = 0; id < row.length; id++) if (row[id] > max) max = row[id]
  let sum = 0
  for (let id = 0; id < row.length; id++) sum += Math.exp(row[id] - max)
  const lse = max + Math.log(sum)
  let tsMax = NEG
  let tsSum = 0
  for (let id = TS_BEGIN; id < row.length; id++) if (row[id] > tsMax) tsMax = row[id]
  if (tsMax > NEG) {
    for (let id = TS_BEGIN; id < row.length; id++) tsSum += Math.exp(row[id] - tsMax)
    const tsLogprob = tsMax + Math.log(tsSum) - lse
    let textMax = NEG
    for (let id = 0; id < TS_BEGIN; id++) if (row[id] > textMax) textMax = row[id]
    if (tsLogprob > textMax - lse) for (let id = 0; id < TS_BEGIN; id++) row[id] = NEG
  }
}

function argmax(row: Float32Array) {
  let best = 0
  for (let i = 1; i < row.length; i++) if (row[i] > row[best]) best = i
  return best
}

function sample(row: Float32Array, temperature: number) {
  let max = -Infinity
  for (const v of row) if (v > max) max = v
  const p = new Float64Array(row.length)
  let sum = 0
  for (let i = 0; i < row.length; i++) sum += p[i] = Math.exp((row[i] - max) / temperature)
  let r = Math.random() * sum
  for (let i = 0; i < p.length; i++) if ((r -= p[i]) <= 0) return i
  return argmax(row)
}

function logSoftmaxAt(row: Float32Array, id: number) {
  let max = -Infinity
  for (const v of row) if (v > max) max = v
  let sum = 0
  for (const v of row) sum += Math.exp(v - max)
  return row[id] - max - Math.log(sum)
}

const softmaxAt = (row: Float32Array, id: number) => Math.exp(logSoftmaxAt(row, id))

/** A decoding stuck in a loop: the same few tokens over and over. */
function repetitive(tokens: number[]) {
  const text = tokens.filter((t) => t < EOT)
  if (text.length < 40) return false
  return new Set(text).size / text.length < 0.25
}

/** Joins segments shorter than half a second into their neighbour, so subtitles do not flash. */
function mergeShort(segments: Segment[]) {
  const out: Segment[] = []
  for (const s of segments) {
    const prev = out[out.length - 1]
    if (prev && (s.end - s.start < 0.5 || prev.end - prev.start < 0.5) && s.start - prev.end < 0.5) {
      prev.end = s.end
      prev.text = `${prev.text} ${s.text}`
    } else out.push({ ...s })
  }
  return out
}
