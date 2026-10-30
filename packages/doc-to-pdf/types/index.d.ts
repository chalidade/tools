// Public types of @chalidade/doc-to-pdf. They mirror
// src/tools/doc-to-pdf/convert.ts; types/check.ts fails the build if they drift.
// Everything here needs a browser (DOM, canvas, print).

/**
 * Renders a .docx into `body` (page sections) and `style` (its CSS) with
 * docx-preview, and returns one <section> per page. Remote resources and
 * script-like links from the file are removed first. Both containers must be
 * in the document (they can be visually hidden, not display:none) for the PDF
 * export to measure the layout.
 */
export declare function renderDocx(file: File, body: HTMLElement, style: HTMLElement): Promise<HTMLElement[]>
/**
 * Snapshots each rendered section into a PDF page image (html2canvas + jsPDF)
 * and saves it as `fileName`. Text in this PDF is not selectable; see `printDocx`.
 */
export declare function downloadPdf(
  sections: HTMLElement[],
  fileName: string,
  onProgress: (done: number, total: number) => void,
): Promise<void>
/** The standalone HTML document `printDocx` prints (Word margins moved onto @page). */
export declare function buildPrintHtml(body: HTMLElement, style: HTMLElement, sections: HTMLElement[]): string
/** Opens the browser's print dialog for the rendered document ("Save as PDF" keeps text selectable). */
export declare function printDocx(body: HTMLElement, style: HTMLElement, sections: HTMLElement[]): Promise<void>
