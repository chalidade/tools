/**
 * <receipt-invoice> — importing this module registers the element.
 *
 * Attributes:
 * - `theme`: "auto" (default, follows the OS), "light" or "dark"
 * - `lang`: "en" or "id" for the UI language (default: the visitor's browser language)
 * - `persist`: "false" = keep nothing in localStorage (default: the last document is kept)
 */
export declare class KwitansiElement extends HTMLElement {
  readonly theme: 'light' | 'dark' | 'auto'
}

declare global {
  interface HTMLElementTagNameMap {
    'receipt-invoice': KwitansiElement
  }
}
