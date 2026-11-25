// Developer kits sold on Gumroad: the tool packages in packages/<tool>/ built
// together (shared chunks), with a commercial license instead of AGPL.
// `node packages/_kits/build.mjs <kit|all>` writes packages/_kits/out/<zip>.
//
// A kit is a bundle; every tool in SINGLES is also sold on its own (the
// "Single Component" product, one variant per tool, built as kit `single-<tool>`).

export const VERSION = '1.0.0'

export const KITS = {
  'pdf-toolkit': {
    title: 'PDF Toolkit',
    tagline: 'Eleven PDF tools that run in the browser: compress, merge, split, organize, sign, watermark, page numbers, protect, unlock, PDF to image, image to PDF.',
    tools: [
      'compress-pdf', 'merge-pdf', 'split-pdf', 'organize-pdf', 'sign-pdf', 'watermark-pdf',
      'page-numbers', 'protect-pdf', 'unlock-pdf', 'pdf-to-image', 'image-to-pdf',
    ],
  },
  'office-converter-kit': {
    title: 'Office Converter Kit',
    tagline: 'Word, Excel and PowerPoint to PDF, and PDF back to Word, Excel, PowerPoint and Markdown, entirely in the browser.',
    tools: ['doc-to-pdf', 'excel-to-pdf', 'ppt-to-pdf', 'pdf-to-word', 'pdf-to-excel', 'pdf-to-ppt', 'pdf-to-markdown'],
  },
  'image-kit': {
    title: 'Image Kit',
    tagline: 'Compress, convert (HEIC, WebP, AVIF), crop and resize, remove backgrounds, strip EXIF, ID photos, favicons and Base64, in the browser.',
    tools: [
      'compress-image', 'convert-image', 'crop-resize-image', 'remove-background', 'strip-exif',
      'pas-foto', 'favicon-generator', 'image-to-base64',
    ],
  },
  'media-kit': {
    title: 'Video & Audio Kit',
    tagline: 'Compress and trim video, GIF to MP4, extract frames, change speed, compress and merge audio, screen and voice recorders, on WebCodecs.',
    tools: [
      'compress-video', 'trim-media', 'gif-mp4', 'extract-frames', 'change-speed',
      'compress-audio', 'merge-audio', 'screen-recorder', 'audio-recorder',
    ],
  },
  'music-kit': {
    title: 'Music Kit',
    tagline: 'Playable piano, guitar and drum machine, a chromatic tuner, metronome, chord diagrams, chord progressions, BPM and key finder, and a practice recorder.',
    tools: ['piano', 'guitar', 'drums', 'guitar-tuner', 'metronome', 'chords', 'chord-progression', 'bpm-key', 'practice-recorder'],
  },
  'dev-utilities-kit': {
    title: 'Developer Utilities Kit',
    tagline: 'QR generator and scanner, JSON formatter and minifier, UUID, passwords, text diff, encode/decode and JWT, color picker, unit converter, word counter.',
    tools: [
      'qr-generator', 'qr-reader', 'json-beautify', 'json-minify', 'uuid', 'password-generator',
      'text-diff', 'encode-decode', 'color-picker', 'unit-converter', 'word-counter',
    ],
  },
  'islamic-kit': {
    title: 'Islamic Kit',
    tagline: 'Prayer times computed on-device, qibla compass, Hijri calendar, zakat calculator and a tasbih counter.',
    tools: ['jadwal-sholat', 'arah-kiblat', 'hijriah', 'zakat', 'tasbih'],
  },
}

/** Tools also sold one by one. */
export const SINGLES = [
  'compress-pdf', 'merge-pdf', 'split-pdf', 'sign-pdf', 'watermark-pdf', 'protect-pdf', 'pdf-to-image',
  'image-to-pdf', 'doc-to-pdf', 'pdf-to-word', 'excel-to-pdf', 'compress-image', 'convert-image',
  'remove-background', 'compress-video', 'trim-media', 'screen-recorder', 'qr-generator', 'qr-reader', 'piano',
]

/** Every package that has a package.json, except kits' own folders. */
export async function allTools() {
  const { readdirSync, existsSync } = await import('node:fs')
  return readdirSync(new URL('..', import.meta.url))
    .filter((d) => !d.startsWith('_') && existsSync(new URL(`../${d}/package.json`, import.meta.url)))
    .sort()
}

export async function kit(id) {
  if (id === 'complete') {
    const tools = await allTools()
    return {
      title: 'Complete Kit',
      tagline: `All ${tools.length} toowl components: PDF, Office, image, video, audio, music, developer, finance and Islamic tools.`,
      tools,
    }
  }
  if (id.startsWith('single-')) {
    const tool = id.slice(7)
    if (!SINGLES.includes(tool)) throw new Error(`${tool} is not sold as a single component`)
    return { title: tool, tagline: '', tools: [tool], single: true }
  }
  if (!KITS[id]) throw new Error(`unknown kit ${id}`)
  return KITS[id]
}

/** Kits listed on marketplaces (CodeCanyon, Codester); no singles: one item per bundle keeps the portfolio tidy for review. */
export const ENVATO_KITS = ['complete', ...Object.keys(KITS)]

/** The marketplaces' live preview (no store links), built by `--preview` and deployed with the site. */
export const PREVIEW_URL = 'https://toowl.my.id/kit-preview/'

export const ALL_KITS = () => ['complete', ...Object.keys(KITS), ...SINGLES.map((t) => `single-${t}`)]
