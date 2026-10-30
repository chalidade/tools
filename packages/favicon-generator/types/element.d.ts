/**
 * <favicon-generator> — importing this module registers the element.
 *
 * Attributes:
 * - `theme`: "auto" (default, follows the OS), "light" or "dark"
 * - `lang`: "en" or "id" for the UI language (default: the visitor's browser language)
 */
export declare class FaviconGeneratorElement extends HTMLElement {
  readonly theme: 'light' | 'dark' | 'auto'
}

declare global {
  interface HTMLElementTagNameMap {
    'favicon-generator': FaviconGeneratorElement
  }
}
