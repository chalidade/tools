/**
 * <basic-calculator> — importing this module registers the element.
 *
 * Attributes:
 * - `theme`: "auto" (default, follows the OS), "light" or "dark"
 * - `persist`: "false" to not keep the history in this browser (localStorage)
 * - `lang`: "en" or "id" for the UI language (default: the visitor's browser language)
 */
export declare class CalculatorElement extends HTMLElement {
  readonly theme: 'light' | 'dark' | 'auto'
}

declare global {
  interface HTMLElementTagNameMap {
    'basic-calculator': CalculatorElement
  }
}
