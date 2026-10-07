import type { RecordingResult } from './index'

export type { RecordingResult } from './index'

/**
 * <screen-recorder> — importing this module registers the element.
 *
 * Attributes:
 * - `theme`: "auto" (default, follows the OS), "light" or "dark"
 * - `persist`: "false" to not keep recordings in this browser (IndexedDB)
 * - `title-indicator`: "true" to show "● Recording 0:42" in the tab title
 * - `lang`: "en" or "id" for the UI language (default: the visitor's browser language)
 *
 * Events:
 * - `recording`: a take finished; `event.detail` is the RecordingResult
 */
export declare class ScreenRecorderElement extends HTMLElement {
  readonly theme: 'light' | 'dark' | 'auto'
}

declare global {
  interface HTMLElementTagNameMap {
    'screen-recorder': ScreenRecorderElement
  }
  interface HTMLElementEventMap {
    recording: CustomEvent<RecordingResult>
  }
}
