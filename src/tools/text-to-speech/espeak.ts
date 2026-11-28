// eSpeak NG (GPL-3.0-or-later) compiled to wasm, from the `espeak-ng` npm
// package: the whole program with every language's data baked into one
// 18 MB wasm. It is a command-line program, so each call runs `main` once in
// a fresh instance (the wasm is compiled once and reused) and reads the
// result back from its in-memory file system. Memory is fixed at 32 MB, so
// callers keep each piece of text short (see `chunks` in tts.ts).

type Factory = (opts: Record<string, unknown>) => Promise<{ FS: { readFile(path: string): Uint8Array } }>

let loaded: Promise<{ factory: Factory; module: WebAssembly.Module }> | null = null

function load() {
  loaded ??= (async () => {
    const [js, wasm] = await Promise.all([import('espeak-ng'), import('espeak-ng/dist/espeak-ng.wasm?url')])
    const module = await WebAssembly.compileStreaming(fetch(wasm.default)).catch(async () =>
      WebAssembly.compile(await (await fetch(wasm.default)).arrayBuffer()),
    )
    return { factory: js.default as Factory, module }
  })().catch((e) => {
    loaded = null
    throw e
  })
  return loaded
}

/** Starts the download early (e.g. while the visitor types). */
export const preloadEspeak = () => void load().catch(() => {})

async function run(args: string[]) {
  const { factory, module } = await load()
  const lines: string[] = []
  const instance = await factory({
    arguments: args,
    print: (line: string) => lines.push(line),
    printErr: () => {},
    instantiateWasm(imports: WebAssembly.Imports, done: (instance: WebAssembly.Instance) => void) {
      void WebAssembly.instantiate(module, imports).then(done)
      return {}
    },
  })
  return { instance, lines }
}

/** IPA phonemes, one line per clause (espeak drops the punctuation). */
export async function espeakPhonemes(text: string, voice: string): Promise<string[]> {
  const { lines } = await run(['-q', '--ipa', '-v', voice, text])
  return lines.map((l) => l.trim()).filter(Boolean)
}

export interface EspeakOptions {
  /** espeak voice, e.g. "id" or "en-us", optionally with a variant: "id+f3". */
  voice: string
  /** Words per minute (80–450; espeak's default is 175). */
  wpm: number
  /** 0–99, default 50. */
  pitch: number
}

/** Speaks `text` and returns mono samples at the WAV's rate (22050 Hz). */
export async function espeakSpeak(text: string, o: EspeakOptions): Promise<{ samples: Float32Array; rate: number }> {
  const { instance } = await run([
    '-v',
    o.voice,
    '-s',
    String(Math.round(o.wpm)),
    '-p',
    String(Math.round(o.pitch)),
    '-w',
    '/out.wav',
    text,
  ])
  return readWav(instance.FS.readFile('/out.wav'))
}

/** 16-bit PCM WAV → float samples (first channel). espeak writes a plain 44-byte header, but walk the chunks anyway. */
export function readWav(bytes: Uint8Array): { samples: Float32Array; rate: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let rate = 22050
  let channels = 1
  let at = 12
  while (at + 8 <= bytes.length) {
    const id = String.fromCharCode(...bytes.subarray(at, at + 4))
    // espeak streams the file, so the data chunk's size field may be 0 or 0x7fffffff: take what is there.
    let size = view.getUint32(at + 4, true)
    if (id === 'fmt ') {
      channels = view.getUint16(at + 10, true)
      rate = view.getUint32(at + 12, true)
    } else if (id === 'data') {
      if (size === 0 || at + 8 + size > bytes.length) size = bytes.length - at - 8
      const count = Math.floor(size / 2 / channels)
      const samples = new Float32Array(count)
      for (let i = 0; i < count; i++) samples[i] = view.getInt16(at + 8 + i * 2 * channels, true) / 32768
      return { samples, rate }
    }
    at += 8 + size + (size & 1)
  }
  return { samples: new Float32Array(0), rate }
}
