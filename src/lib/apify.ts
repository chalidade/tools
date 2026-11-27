// toowl's paid Apify Actors (apify/ in this repo): the same engines run on a
// server, for people who need thousands of files through an API, Zapier, Make
// or n8n. Links carry the Apify affiliate token, so a visitor who signs up to
// Apify from here is credited to toowl. Plain links only — nothing on the site
// talks to Apify.
//
// An Actor is linked only once it is published on the Apify Store (`published`);
// until then its page is private and would 404 for visitors.

export const APIFY_REF = 'toowl'
export const APIFY_USER = 'toowl'

export interface ApifyActor {
  /** Unique name on Apify: apify.com/toowl/<name> */
  name: string
  published: boolean
}

/** Tool slug → its Actor. */
export const APIFY_ACTORS: Record<string, ApifyActor> = {
  'compress-pdf': { name: 'pdf-compressor', published: false },
  'convert-image': { name: 'image-converter', published: true },
  // Moves to 'image-compressor' once that Actor is published.
  'compress-image': { name: 'image-converter', published: true },
  'qr-reader': { name: 'qr-barcode-reader', published: true },
  'upscale-image': { name: 'ai-image-upscaler', published: true },
  ocr: { name: 'ocr-image-pdf-to-text', published: true },
  'pdf-to-markdown': { name: 'pdf-to-markdown', published: true },
  'compress-video': { name: 'video-compressor', published: false },
  'gif-mp4': { name: 'video-compressor', published: false },
  'compress-audio': { name: 'audio-converter', published: false },
  'remove-background': { name: 'background-remover', published: false },
  'extract-frames': { name: 'video-frame-extractor', published: false },
  'doc-to-pdf': { name: 'office-converter', published: false },
  'excel-to-pdf': { name: 'office-converter', published: false },
  'ppt-to-pdf': { name: 'office-converter', published: false },
  'pdf-to-image': { name: 'pdf-to-image', published: false },
  'image-to-svg': { name: 'image-to-svg', published: false },
  'merge-pdf': { name: 'pdf-toolkit', published: false },
  'split-pdf': { name: 'pdf-toolkit', published: false },
  'organize-pdf': { name: 'pdf-toolkit', published: false },
  'unlock-pdf': { name: 'pdf-toolkit', published: false },
}

const withRef = (url: string) => `${url}${url.includes('?') ? '&' : '?'}fpr=${APIFY_REF}`

/** The tool's Actor page (with the affiliate token), or null when it has none yet. */
export function apifyActorUrl(slug: string): string | null {
  const actor = APIFY_ACTORS[slug]
  return actor?.published ? withRef(`https://apify.com/${APIFY_USER}/${actor.name}`) : null
}

/** All of toowl's Actors on Apify, once at least one is published. */
export function apifyProfileUrl(): string | null {
  return Object.values(APIFY_ACTORS).some((a) => a.published) ? withRef(`https://apify.com/${APIFY_USER}`) : null
}
