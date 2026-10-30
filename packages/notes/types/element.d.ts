/**
 * <markdown-notes> — importing this module registers the element.
 *
 * Attributes:
 * - `theme`: "auto" (default, follows the OS), "light" or "dark"
 * - `persist`: "false" to not keep notes in this browser (IndexedDB); they last until the page closes
 * - `lang`: "en" or "id" for the UI language (default: the visitor's browser language)
 */
export declare class NotesElement extends HTMLElement {
  readonly theme: 'light' | 'dark' | 'auto'
}

declare global {
  interface HTMLElementTagNameMap {
    'markdown-notes': NotesElement
  }
}
