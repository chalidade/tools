// Neural voice: a Piper (VITS) model run with ONNX Runtime Web. The voice is
// en_US-joe-medium (CC0), int8-quantized to 16.6 MB and bundled with the
// site; it is fetched only when someone picks it. Piper reads espeak IPA
// phonemes through its default phoneme→id map (piper-phonemize's
// DEFAULT_PHONEME_ID_MAP, ids 0–129, the order of the string below), each
// followed by the pad id, between BOS and EOS.

import type { InferenceSession, Tensor } from 'onnxruntime-web'

export const PIPER_RATE = 22050

const SYMBOLS =
  "_^$ !'(),-.:;?abcdefhijklmnopqrstuvwxyzæçðøħŋœǀǁǂǃɐɑɒɓɔɕɖɗɘəɚɛɜɞɟɠɡɢɣɤɥɦɧɨɪɫɬɭɮɯɰɱɲɳɴɵɶɸɹɺɻɽɾʀʁʂʃʄʈʉʊʋʌʍʎʏʐʑʒʔʕʘʙʛʜʝʟʡʢʲˈˌːˑ˞βθχᵻⱱ"
const IDS = new Map([...SYMBOLS].map((c, i) => [c, i]))
const PAD = 0
const BOS = 1
const EOS = 2

/** Phoneme text (IPA with punctuation) → model input ids. Unknown symbols are skipped. */
export function phonemeIds(phonemes: string): number[] {
  const ids = [BOS, PAD]
  for (const c of phonemes) {
    const id = IDS.get(c)
    if (id !== undefined) ids.push(id, PAD)
  }
  ids.push(EOS)
  return ids
}

interface Engine {
  session: InferenceSession
  Tensor: typeof Tensor
}

let engine: Promise<Engine> | null = null

export function loadPiper(): Promise<Engine> {
  engine ??= (async () => {
    // The same runtime files as upscale-image, so a visitor who used one has them cached for the other.
    const [ort, wasm, model] = await Promise.all([
      import('onnxruntime-web/webgpu'),
      import('onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url'),
      import('./en_US-joe-medium.int8.onnx?url'),
    ])
    ort.env.wasm.wasmPaths = { wasm: wasm.default }
    ort.env.logLevel = 'error'
    const bytes = new Uint8Array(await (await fetch(model.default)).arrayBuffer())
    const session = await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' })
    return { session, Tensor: ort.Tensor }
  })().catch((e) => {
    engine = null
    throw e
  })
  return engine
}

/** One utterance. `speed` > 1 talks faster (Piper's length scale is its inverse). */
export async function piperSpeak(phonemes: string, speed: number): Promise<Float32Array> {
  const { session, Tensor } = await loadPiper()
  const ids = phonemeIds(phonemes)
  if (ids.length <= 3) return new Float32Array(0)
  const out = await session.run({
    input: new Tensor('int64', BigInt64Array.from(ids, BigInt), [1, ids.length]),
    input_lengths: new Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
    // noise, length, noise width: Piper's defaults for medium voices.
    scales: new Tensor('float32', Float32Array.from([0.667, 1 / speed, 0.8]), [3]),
  })
  return out[session.outputNames[0]].data as Float32Array
}
