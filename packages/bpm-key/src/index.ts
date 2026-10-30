// The headless API. The source lives with the site (src/tools/bpm-key/analyze.ts),
// so the tool on chalidade.github.io/tools and this package are the same code.
//
//   import { decodeToMono, analyze, camelot } from '@chalidade/bpm-key'
//   const result = analyze(await decodeToMono(file)) // { bpm: 120.0, key: { tonic: 9, minor: true }, … }

export { analyze, decodeToMono, camelot, RATE, type Analysis } from '@/tools/bpm-key/analyze'
