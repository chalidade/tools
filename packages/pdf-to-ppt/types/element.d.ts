/**
 * <pdf-to-ppt> — importing this module registers the element.
 *
 * Attributes:
 * - `theme`: "auto" (default, follows the OS), "light" or "dark"
 * - `lang`: "en" or "id" for the UI language (default: the visitor's browser language)
 */
export declare class PdfToPptElement extends HTMLElement {
  readonly theme: 'light' | 'dark' | 'auto'
}

declare global {
  interface HTMLElementTagNameMap {
    'pdf-to-ppt': PdfToPptElement
  }
}
