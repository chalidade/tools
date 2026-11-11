// Minimal types for @jitsi/rnnoise-wasm's Emscripten factory, which ships none.
declare module '@jitsi/rnnoise-wasm/dist/rnnoise.js' {
  const createRNNWasmModule: (opts: { locateFile?: (path: string) => string; wasmBinary?: ArrayBuffer }) => Promise<unknown>
  export default createRNNWasmModule
}
