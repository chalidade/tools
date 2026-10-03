// qpdf (https://qpdf.readthedocs.io) compiled to WebAssembly, run in the
// visitor's browser. Files go into the module's in-memory file system, never
// over the network. The ~1.3 MB wasm loads only when a tool first needs it.

import type { QpdfInstance } from '@neslinesli93/qpdf-wasm'

export interface QpdfResult {
  /** 0 = success, 3 = success with warnings, 2 = error. */
  code: number
  /** Everything qpdf printed to stderr/stdout, for error messages. */
  log: string
  /** Bytes of `/out` when the command produced it. */
  output?: Uint8Array
}

const IN = '/in'
const OUT = '/out'

/**
 * Runs one qpdf command. `args` gets the input and output paths; return the
 * full argument list. A fresh instance per call: an Emscripten program's
 * main() is not meant to run twice in one instance.
 */
export async function runQpdf(
  input: Uint8Array,
  args: (inPath: string, outPath: string) => string[],
): Promise<QpdfResult> {
  const [{ default: createModule }, { default: wasmUrl }] = await Promise.all([
    import('@neslinesli93/qpdf-wasm'),
    import('@neslinesli93/qpdf-wasm/dist/qpdf.wasm?url'),
  ])
  // This build binds `console.log`/`console.error` once, while the module is
  // created, and prints qpdf's stdout/stderr through them (it ignores
  // Emscripten's print/printErr options). Hand it forwarding functions during
  // that synchronous creation call, then point them at a buffer while qpdf
  // runs — that is how messages like "invalid password" are read.
  let sink: string[] | null = null
  const saved = { log: console.log, error: console.error }
  const forward =
    (to: (...parts: unknown[]) => void) =>
    (...parts: unknown[]) =>
      sink ? sink.push(parts.map(String).join(' ')) : to(...parts)
  console.log = forward(saved.log)
  console.error = forward(saved.error)
  let created: Promise<QpdfInstance>
  try {
    created = (createModule as unknown as (opts: object) => Promise<QpdfInstance>)({
      locateFile: () => wasmUrl,
      noInitialRun: true,
    })
  } finally {
    Object.assign(console, saved)
  }
  const qpdf = (await created) as QpdfInstance & {
    FS: QpdfInstance['FS'] & { writeFile(path: string, data: Uint8Array | string): void }
  }

  qpdf.FS.writeFile(IN, input)
  const lines: string[] = []
  sink = lines
  let code: number
  try {
    code = qpdf.callMain(args(IN, OUT))
  } catch (e) {
    // Emscripten reports exit() by throwing an ExitStatus carrying the code.
    code = typeof (e as { status?: number }).status === 'number' ? (e as { status: number }).status : 2
  } finally {
    sink = null
  }

  let output: Uint8Array | undefined
  try {
    output = qpdf.FS.readFile(OUT)
  } catch {
    // No output file: the command failed or only inspected the input.
  }
  return { code, log: lines.join('\n'), output }
}

export const isPasswordError = (log: string) => /invalid password/i.test(log)

/**
 * Encryption state. (qpdf 12's --requires-password fails outright on a
 * password-protected file, so read --show-encryption's outcome instead.)
 */
export async function encryptionInfo(input: Uint8Array) {
  const { code, log } = await runQpdf(input, (i) => ['--show-encryption', i])
  if (isPasswordError(log)) return { encrypted: true, needsPassword: true }
  if (code !== 2 && /not encrypted/i.test(log)) return { encrypted: false, needsPassword: false }
  // Opens without a password but carries an owner password and restrictions.
  return { encrypted: code !== 2, needsPassword: false }
}
