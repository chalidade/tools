// espeak-ng ships no types: an Emscripten MODULARIZE factory that runs the CLI's main with `arguments`.
declare module 'espeak-ng' {
  const ESpeakNg: (opts: Record<string, unknown>) => Promise<{ FS: { readFile(path: string): Uint8Array } }>
  export default ESpeakNg
}
