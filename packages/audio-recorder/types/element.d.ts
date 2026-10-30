/**
 * <audio-recorder> — importing this module registers the element.
 *
 * Attributes:
 * - `theme`: "auto" (default, follows the OS), "light" or "dark"
 * - `persist`: "false" to not keep recordings in this browser (IndexedDB)
 * - `lang`: "en" or "id" for the UI language (default: the visitor's browser language)
 *
 * Events:
 * - `recording`: fired when a recording finishes; `event.detail` is a `Recording`
 *   ({ id, name, createdAt, duration, mimeType, blob })
 */
export declare class AudioRecorderElement extends HTMLElement {
  readonly theme: 'light' | 'dark' | 'auto'
}

declare global {
  interface HTMLElementTagNameMap {
    'audio-recorder': AudioRecorderElement
  }
}
