/**
 * <web-whiteboard> — importing this module registers the element.
 *
 * Attributes:
 * - `theme`: "auto" (default, follows the OS), "light" or "dark"
 * - `persist`: "false" to not autosave the board in this browser (localStorage)
 * - `lang`: "en" or "id" for the UI language (default: the visitor's browser language)
 */
export declare class WhiteboardElement extends HTMLElement {
  readonly theme: 'light' | 'dark' | 'auto'
}

declare global {
  interface HTMLElementTagNameMap {
    'web-whiteboard': WhiteboardElement
  }
}
