// Whisper's input: an 80-band log-mel spectrogram of 30 s of 16 kHz audio
// (3000 frames, 25 ms Hann window every 10 ms), computed the same way as
// OpenAI's `log_mel_spectrogram` / Hugging Face's WhisperFeatureExtractor:
// centered STFT with reflect padding, power spectrum, Slaney mel filters up
// to 8 kHz, log10, clamped to 8 below the peak, then scaled to about ±1.

export const RATE = 16000
export const N_FFT = 400
export const HOP = 160
export const FRAMES = 3000
export const WINDOW = FRAMES * HOP // 480000 samples = 30 s
export const MELS = 80
const BINS = N_FFT / 2 + 1

const hzToMel = (f: number) => (f < 1000 ? (3 * f) / 200 : 15 + (27 * Math.log(f / 1000)) / Math.log(6.4))
const melToHz = (m: number) => (m < 15 ? (200 * m) / 3 : 1000 * Math.pow(6.4, (m - 15) / 27))

let tables: { filters: Float32Array; window: Float32Array; cos: Float32Array; sin: Float32Array } | null = null

function getTables() {
  if (tables) return tables
  // Slaney-style triangular filters with area normalization (librosa's default, as Whisper uses).
  const filters = new Float32Array(MELS * BINS)
  const lo = hzToMel(0)
  const hi = hzToMel(RATE / 2)
  const pts = Array.from({ length: MELS + 2 }, (_, i) => melToHz(lo + ((hi - lo) * i) / (MELS + 1)))
  for (let m = 0; m < MELS; m++) {
    const [l, c, r] = [pts[m], pts[m + 1], pts[m + 2]]
    const norm = 2 / (r - l)
    for (let k = 0; k < BINS; k++) {
      const f = (k * RATE) / N_FFT
      const v = Math.max(0, Math.min((f - l) / (c - l), (r - f) / (r - c)))
      filters[m * BINS + k] = v * norm
    }
  }
  const window = new Float32Array(N_FFT)
  for (let i = 0; i < N_FFT; i++) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N_FFT) // periodic Hann
  // N_FFT is 400, not a power of two: a direct DFT with tables is simple and fast enough (~0.3 s per window).
  const cos = new Float32Array(BINS * N_FFT)
  const sin = new Float32Array(BINS * N_FFT)
  for (let k = 0; k < BINS; k++)
    for (let n = 0; n < N_FFT; n++) {
      const a = (2 * Math.PI * ((k * n) % N_FFT)) / N_FFT
      cos[k * N_FFT + n] = Math.cos(a)
      sin[k * N_FFT + n] = Math.sin(a)
    }
  tables = { filters, window, cos, sin }
  return tables
}

/**
 * Log-mel features of `audio[start, start + 30 s)`, zero-padded past the end,
 * laid out as [80][3000] for the encoder's `input_features`.
 */
export function logMel(audio: Float32Array, start: number): Float32Array {
  const { filters, window, cos, sin } = getTables()
  const pad = N_FFT / 2
  // The 30 s window, zero-padded, then reflect-padded by N_FFT/2 on both sides (torch.stft center=True).
  const x = new Float32Array(WINDOW + 2 * pad)
  x.set(audio.subarray(start, Math.min(audio.length, start + WINDOW)), pad)
  for (let i = 0; i < pad; i++) {
    x[pad - 1 - i] = x[pad + 1 + i]
    x[pad + WINDOW + i] = x[pad + WINDOW - 2 - i]
  }
  const out = new Float32Array(MELS * FRAMES)
  const frame = new Float32Array(N_FFT)
  const power = new Float32Array(BINS)
  let peak = -Infinity
  for (let t = 0; t < FRAMES; t++) {
    const o = t * HOP
    for (let n = 0; n < N_FFT; n++) frame[n] = x[o + n] * window[n]
    for (let k = 0; k < BINS; k++) {
      let re = 0
      let im = 0
      const row = k * N_FFT
      for (let n = 0; n < N_FFT; n++) {
        re += frame[n] * cos[row + n]
        im -= frame[n] * sin[row + n]
      }
      power[k] = re * re + im * im
    }
    for (let m = 0; m < MELS; m++) {
      let s = 0
      const row = m * BINS
      for (let k = 0; k < BINS; k++) s += filters[row + k] * power[k]
      const v = Math.log10(Math.max(s, 1e-10))
      out[m * FRAMES + t] = v
      if (v > peak) peak = v
    }
  }
  const floor = peak - 8
  for (let i = 0; i < out.length; i++) out[i] = (Math.max(out[i], floor) + 4) / 4
  return out
}
