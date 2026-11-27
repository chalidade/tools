// qpdf 12 compiled to WebAssembly (@neslinesli93/qpdf-wasm, qpdf itself is
// Apache-2.0). No system packages needed. One fresh module instance per
// command: an Emscripten program's main() is not meant to run twice.

import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const createModule = require('@neslinesli93/qpdf-wasm')
const WASM = require.resolve('@neslinesli93/qpdf-wasm/dist/qpdf.wasm')

const IN = '/in'
const OUT = '/out'

/**
 * Runs one qpdf command. `args(inPath, outPath)` returns the argument list.
 * Resolves to { code, log, output } — code 0 ok, 3 ok with warnings, 2 error.
 */
export async function runQpdf(input, args) {
  // This build binds console.log/error once, at creation, and prints qpdf's
  // output through them. Forward them while creating, buffer while running.
  let sink = null
  const saved = { log: console.log, error: console.error }
  const forward = (to) => (...parts) => (sink ? sink.push(parts.map(String).join(' ')) : to(...parts))
  console.log = forward(saved.log)
  console.error = forward(saved.error)
  let created
  try {
    created = createModule({ locateFile: () => WASM, noInitialRun: true })
  } finally {
    Object.assign(console, saved)
  }
  const qpdf = await created
  qpdf.FS.writeFile(IN, input)
  const lines = []
  sink = lines
  let code
  // On Node, Emscripten's exit() also sets process.exitCode; a failed qpdf
  // command must not make the whole run exit non-zero.
  const exitCode = process.exitCode
  try {
    code = qpdf.callMain(args(IN, OUT))
  } catch (e) {
    code = typeof e?.status === 'number' ? e.status : 2
  } finally {
    sink = null
    process.exitCode = exitCode
  }
  let output
  try {
    output = qpdf.FS.readFile(OUT)
  } catch {
    output = undefined
  }
  return { code, log: lines.join('\n'), output }
}
