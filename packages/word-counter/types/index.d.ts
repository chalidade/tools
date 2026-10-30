// Public types of @chalidade/word-counter. They mirror
// src/tools/word-counter/count.ts; types/check.ts fails the build if they drift.

export interface TextStats {
  words: number
  /** User-perceived characters: an emoji counts as one. */
  chars: number
  charsNoSpaces: number
  sentences: number
  paragraphs: number
  lines: number
  /** Minutes to read silently / speak aloud. */
  readMinutes: number
  speakMinutes: number
}

/** A platform's character limit. */
export interface Limit {
  id: string
  name: string
  max: number
  /** Soft limits (SEO) are advice, not a hard cut-off. */
  soft?: boolean
}

/** Silent reading speed used for readMinutes (words per minute). */
export declare const READ_WPM = 230
/** Speaking speed used for speakMinutes (words per minute). */
export declare const SPEAK_WPM = 130
/** X, Instagram, TikTok, WhatsApp status, LinkedIn, SMS, SEO title and meta description limits. */
export declare const LIMITS: Limit[]

export declare function analyze(text: string): TextStats
/** Words, keeping "don't", "kupu-kupu" and "3.5" as one word each. */
export declare function countWords(text: string): number
export declare function countSentences(text: string): number
/** Length in user-perceived characters (an emoji counts as one). */
export declare function graphemeLength(text: string): number
/** Minutes → whole minutes and seconds. */
export declare function minutesToParts(minutes: number): { min: number; sec: number }
