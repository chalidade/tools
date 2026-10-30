// Public types of @chalidade/ppt-to-pdf. They mirror
// src/tools/ppt-to-pdf/convert.ts; types/check.ts fails the build if they drift.
// Everything here needs a browser (DOM, canvas, print).

export interface Deck {
  /** Sanitized HTML (DOMPurify), one `div.slide` per slide. */
  slides: string[]
  /** Slide size in CSS pixels. */
  width: number
  height: number
}

/** Reads a .pptx into sanitized HTML slides (@jvmr/pptx-to-html). Only embedded (data:) images may load. */
export declare function readPptx(file: File): Promise<Deck>
/**
 * Snapshots rendered slide elements (put `deck.slides` into the page first)
 * into a PDF, one page per slide, as images.
 */
export declare function downloadPdf(
  slides: HTMLElement[],
  deck: Deck,
  onProgress: (done: number, total: number) => void,
): Promise<Blob>
/** The standalone HTML document `printDeck` prints: one slide per page, page = slide size. */
export declare function buildPrintHtml(deck: Deck, title: string): string
/** Opens the browser's print dialog for the deck ("Save as PDF" keeps text selectable). */
export declare function printDeck(deck: Deck, title: string): Promise<void>
