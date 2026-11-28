/**
 * <upscale-image> — importing this module registers the element.
 *
 * Attributes:
 * - `theme`: "auto" (default, follows the OS), "light" or "dark"
 * - `lang`: "en" or "id" for the UI language (default: the visitor's browser language)
 */
export declare class UpscaleImageElement extends HTMLElement {
  theme: 'light' | 'dark' | 'auto'
}

declare global {
  interface HTMLElementTagNameMap {
    'upscale-image': UpscaleImageElement
  }
}
