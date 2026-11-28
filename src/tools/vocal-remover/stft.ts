// SCNet's STFT and iSTFT, as torch.stft/istft compute them with the model's
// settings: n_fft 4096, hop 1024, a rectangular window (torch's default when
// none is given), normalized (scaled 1/√n_fft), centered with reflect padding,
// one-sided. Two real signals share one complex FFT each way.

export const N_FFT = 4096
export const HOP = 1024
export const BINS = N_FFT / 2 + 1

const LOG2 = Math.log2(N_FFT)
const SCALE = 1 / Math.sqrt(N_FFT)

const cos = new Float64Array(N_FFT / 2)
const sin = new Float64Array(N_FFT / 2)
for (let i = 0; i < N_FFT / 2; i++) {
  cos[i] = Math.cos((2 * Math.PI * i) / N_FFT)
  sin[i] = Math.sin((2 * Math.PI * i) / N_FFT)
}
const rev = new Uint16Array(N_FFT)
for (let i = 0; i < N_FFT; i++) {
  let r = 0
  for (let b = 0; b < LOG2; b++) r |= ((i >> b) & 1) << (LOG2 - 1 - b)
  rev[i] = r
}

/** In-place radix-2 FFT of (re, im); `inverse` flips the twiddles' sign (no 1/N). */
function fft(re: Float64Array, im: Float64Array, inverse: boolean) {
  for (let i = 0; i < N_FFT; i++) {
    const j = rev[i]
    if (j > i) {
      let t = re[i]
      re[i] = re[j]
      re[j] = t
      t = im[i]
      im[i] = im[j]
      im[j] = t
    }
  }
  const sign = inverse ? 1 : -1
  for (let size = 2; size <= N_FFT; size <<= 1) {
    const half = size >> 1
    const step = N_FFT / size
    for (let start = 0; start < N_FFT; start += size) {
      for (let k = 0; k < half; k++) {
        const wr = cos[k * step]
        const wi = sign * sin[k * step]
        const a = start + k
        const b = a + half
        const tr = re[b] * wr - im[b] * wi
        const ti = re[b] * wi + im[b] * wr
        re[b] = re[a] - tr
        im[b] = im[a] - ti
        re[a] += tr
        im[a] += ti
      }
    }
  }
}

/** Frames of a signal of `length` samples, centered. */
export const frameCount = (length: number) => 1 + Math.floor(length / HOP)

const reflect = (i: number, n: number) => (i < 0 ? -i : i >= n ? 2 * (n - 1) - i : i)

/**
 * STFT of two channels into `out` laid out [4][BINS][frames]: L re, L im, R re, R im.
 * `left`/`right` hold `length` samples.
 */
export function stft(left: Float32Array, right: Float32Array, out: Float32Array, frames: number) {
  const length = left.length
  const re = new Float64Array(N_FFT)
  const im = new Float64Array(N_FFT)
  const plane = BINS * frames
  for (let t = 0; t < frames; t++) {
    const start = t * HOP - N_FFT / 2
    for (let n = 0; n < N_FFT; n++) {
      const i = reflect(start + n, length)
      re[n] = left[i]
      im[n] = right[i]
    }
    fft(re, im, false)
    for (let k = 0; k < BINS; k++) {
      const m = (N_FFT - k) & (N_FFT - 1)
      // z = l + i·r: L[k] = (Z[k] + conj Z[N−k]) / 2, R[k] = (Z[k] − conj Z[N−k]) / 2i
      const o = k * frames + t
      out[o] = ((re[k] + re[m]) / 2) * SCALE
      out[plane + o] = ((im[k] - im[m]) / 2) * SCALE
      out[2 * plane + o] = ((im[k] + im[m]) / 2) * SCALE
      out[3 * plane + o] = ((re[m] - re[k]) / 2) * SCALE
    }
  }
}

/**
 * iSTFT of two one-sided spectra (re/im planes of [BINS][frames] at the given
 * offsets in `spec`): the first `length` samples of each are handed to `add`.
 */
export function istftPair(
  spec: Float32Array,
  a: { re: number; im: number },
  b: { re: number; im: number },
  frames: number,
  length: number,
  add: (i: number, x: number, y: number) => void,
) {
  const full = N_FFT + HOP * (frames - 1)
  const accA = new Float64Array(full)
  const accB = new Float64Array(full)
  const re = new Float64Array(N_FFT)
  const im = new Float64Array(N_FFT)
  // torch.istft(normalized=True): irfft (1/N) times √N
  const scale = SCALE
  for (let t = 0; t < frames; t++) {
    for (let k = 0; k < BINS; k++) {
      const o = k * frames + t
      const edge = k === 0 || k === N_FFT / 2
      const ar = spec[a.re + o]
      const ai = edge ? 0 : spec[a.im + o]
      const br = spec[b.re + o]
      const bi = edge ? 0 : spec[b.im + o]
      // Z = A + i·B over the full (Hermitian) spectrum
      re[k] = ar - bi
      im[k] = ai + br
      if (!edge) {
        const m = N_FFT - k
        // A[m] = conj A[k], B[m] = conj B[k]
        re[m] = ar + bi
        im[m] = -ai + br
      }
    }
    fft(re, im, true)
    const base = t * HOP
    for (let n = 0; n < N_FFT; n++) {
      accA[base + n] += re[n] * scale
      accB[base + n] += im[n] * scale
    }
  }
  // Rectangular window: the envelope is how many frames cover each sample.
  const off = N_FFT / 2
  for (let i = 0; i < length; i++) {
    const p = i + off
    const first = Math.max(0, Math.ceil((p - N_FFT + 1) / HOP))
    const last = Math.min(frames - 1, Math.floor(p / HOP))
    const env = last - first + 1
    add(i, accA[p] / env, accB[p] / env)
  }
}
