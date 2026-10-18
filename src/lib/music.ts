// Note and pitch helpers shared by the music tools (tuner, chords, BPM & key).

export const SHARPS = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'] as const
export const FLATS = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'] as const

/** 0–11 for any integer, negative included. */
export const pc = (n: number) => ((n % 12) + 12) % 12

/** Frequency of a MIDI note number for a given A4 reference. */
export const midiToFreq = (midi: number, a4 = 440) => a4 * 2 ** ((midi - 69) / 12)

/** Fractional MIDI note number of a frequency. */
export const freqToMidi = (freq: number, a4 = 440) => 69 + 12 * Math.log2(freq / a4)

/** Just the letter, without the octave: "A♯". */
export const noteLetter = (midi: number, flats = false) => (flats ? FLATS : SHARPS)[pc(midi)]

/** "E2", "A♯3"… */
export const noteName = (midi: number, flats = false) => `${noteLetter(midi, flats)}${Math.floor(midi / 12) - 1}`

/**
 * Pitch class of a note spelled in plain ASCII or with ♯/♭: "C", "c#", "Db",
 * "B♭". Null when it is not a note.
 */
export function parseNote(s: string): number | null {
  const m = /^([A-Ga-g])([#♯b♭]?)$/.exec(s)
  if (!m) return null
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1].toUpperCase() as 'C']
  return pc(base + (m[2] === '#' || m[2] === '♯' ? 1 : m[2] === 'b' || m[2] === '♭' ? -1 : 0))
}

/**
 * A plucked-string sound (Karplus–Strong) as an AudioBuffer: warmer than an
 * oscillator, and cheap enough to render on the spot.
 */
export function pluck(ctx: BaseAudioContext, freq: number, seconds = 2.5): AudioBuffer {
  const rate = ctx.sampleRate
  const buffer = ctx.createBuffer(1, Math.floor(rate * seconds), rate)
  const out = buffer.getChannelData(0)
  const period = Math.max(2, Math.round(rate / freq))
  const ring = new Float32Array(period)
  for (let i = 0; i < period; i++) ring[i] = Math.random() * 2 - 1
  let prev = 0
  for (let i = 0; i < out.length; i++) {
    const j = i % period
    const next = 0.996 * 0.5 * (ring[j] + prev)
    prev = ring[j]
    ring[j] = next
    out[i] = next * 0.5
  }
  return buffer
}
