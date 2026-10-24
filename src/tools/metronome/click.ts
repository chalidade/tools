/** One metronome click at `when` (AudioContext time): a short sine blip, higher for the accent, softer for a subdivision. */
export function click(ctx: AudioContext, when: number, kind: 'accent' | 'beat' | 'sub') {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.frequency.value = kind === 'accent' ? 1760 : kind === 'beat' ? 1100 : 800
  const peak = kind === 'sub' ? 0.25 : 0.6
  gain.gain.setValueAtTime(0.0001, when)
  gain.gain.exponentialRampToValueAtTime(peak, when + 0.002)
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.05)
  osc.connect(gain).connect(ctx.destination)
  osc.start(when)
  osc.stop(when + 0.06)
}
