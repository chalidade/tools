/**
 * <pdf-to-excel> — importing this module registers the element.
 *
 * Attributes:
 * - `theme`: "auto" (default, follows the OS), "light" or "dark"
 * - `lang`: "en" or "id" for the UI language (default: the visitor's browser language)
 */
export declare class PdfToExcelElement extends HTMLElement {
  readonly theme: 'light' | 'dark' | 'auto'
}

declare global {
  interface HTMLElementTagNameMap {
    'pdf-to-excel': PdfToExcelElement
  }
}
