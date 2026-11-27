// qpdf 12 compiled to WebAssembly (@neslinesli93/qpdf-wasm; qpdf is
// Apache-2.0). One fresh module instance per command: an Emscripten
// program's main() is not meant to run twice.

import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const createModule = require('@neslinesli93/qpdf-wasm')
const WASM = require.resolve('@neslinesli93/qpdf-wasm/dist/qpdf.wasm')

/**
 * Runs one qpdf command with `inputs` written to /in/<name> and an empty /out
 * folder. Resolves to { code, log, outputs: Map<name, Uint8Array> } — code 0
 * ok, 3 ok with warnings, 2 error.
 */
export async function qpdf(inputs, args) {
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
  const m = await created
  m.FS.mkdir('/in')
  m.FS.mkdir('/out')
  for (const [name, bytes] of Object.entries(inputs)) m.FS.writeFile(`/in/${name}`, bytes)
  const lines = []
  sink = lines
  let code
  // On Node, Emscripten's exit() also sets process.exitCode; a failed qpdf
  // command must not make the whole run exit non-zero.
  const exitCode = process.exitCode
  try {
    code = m.callMain(args)
  } catch (e) {
    code = typeof e?.status === 'number' ? e.status : 2
  } finally {
    sink = null
    process.exitCode = exitCode
  }
  const outputs = new Map()
  for (const name of m.FS.readdir('/out')) {
    if (name !== '.' && name !== '..') outputs.set(name, m.FS.readFile(`/out/${name}`))
  }
  return { code, log: lines.join('\n'), outputs }
}
