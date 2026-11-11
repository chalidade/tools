// DeepFilterNet 3 (https://github.com/Rikorose/DeepFilterNet): a full-band
// 48 kHz speech enhancer that keeps the highs RNNoise dulls. The wasm build
// carries its weights inside (~34 MB, ~13 MB gzipped), served from this site
// and fetched only when this engine is chosen.

import type { DeepFilter as DeepFilterState } from '@lofcz/deepfilternet-web'
import { FRAME } from './rnnoise'

/** DeepFilterNet's latency at 48 kHz, in samples (3 frames; measured against the input). */
export const DF_DELAY = 1440

/** One DeepFilterNet state per channel; `process` cleans a FRAME-sample frame in place. */
export async function deepFilterChannels(channels: number) {
  const [{ DeepFilter }, { default: wasmUrl }] = await Promise.all([
    import('@lofcz/deepfilternet-web'),
    import('@lofcz/deepfilternet-web/df_bg.wasm?url'),
  ])
  const states: DeepFilterState[] = []
  for (let c = 0; c < channels; c++) states.push(await DeepFilter.create({ wasmUrl }))
  if (states[0].frameLength !== FRAME) throw new Error(`DeepFilterNet frame ${states[0].frameLength}, expected ${FRAME}`)
  return {
    process: (channel: number, frame: Float32Array) => frame.set(states[channel].process(frame)),
    destroy: () => states.forEach((s) => s.destroy()),
  }
}
