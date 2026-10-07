// <screen-recorder> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/screen-recorder@0/dist/element.js"></script>
//   <screen-recorder theme="auto"></screen-recorder>
//
// React renders the site's own ScreenRecorder into a Shadow DOM, so the host
// page's CSS can't break it and its CSS can't leak out.

import { createRoot, type Root } from 'react-dom/client'
import ScreenRecorder from '@/tools/screen-recorder/ScreenRecorder'
import type { RecordingResult } from '@/tools/screen-recorder/screen'
import css from './element.css?inline'

/**
 * Tailwind declares its internal variables with `@property`, which a browser
 * only honours at document level — inside a shadow root it is ignored and
 * utilities like `translate-x-4` or `shadow-lg` break. So those rules go to
 * the page head once, and the rest stays in the shadow root.
 */
const PROPERTY_RULE = /@property\s+[^{]+\{[^}]*\}/g
const shadowCss = css.replace(PROPERTY_RULE, '')
function hoistProperties() {
  if (document.getElementById('chalidade-tools-properties')) return
  const style = document.createElement('style')
  style.id = 'chalidade-tools-properties'
  style.textContent = (css.match(PROPERTY_RULE) ?? []).join('\n')
  document.head.append(style)
}

type Theme = 'light' | 'dark' | 'auto'

export class ScreenRecorderElement extends HTMLElement {
  static observedAttributes = ['theme', 'persist', 'title-indicator']

  #root: Root | null = null
  #frame: HTMLDivElement | null = null
  #media = window.matchMedia('(prefers-color-scheme: dark)')
  #onScheme = () => this.#paint()

  connectedCallback() {
    if (!this.#root) {
      hoistProperties()
      // Re-attached elements (moved by a framework) keep their shadow root.
      const shadow = this.shadowRoot ?? this.attachShadow({ mode: 'open' })
      const style = document.createElement('style')
      style.textContent = shadowCss
      this.#frame = document.createElement('div')
      this.#frame.className = 'sr-frame text-foreground font-sans antialiased'
      shadow.append(style, this.#frame)
      this.#root = createRoot(this.#frame)
    }
    this.#media.addEventListener('change', this.#onScheme)
    this.#render()
  }

  disconnectedCallback() {
    this.#media.removeEventListener('change', this.#onScheme)
    // Unmounting stops (and keeps) a recording in progress.
    this.#root?.unmount()
    this.#root = null
    this.shadowRoot?.replaceChildren()
  }

  attributeChangedCallback() {
    this.#render()
  }

  get theme(): Theme {
    const t = this.getAttribute('theme')
    return t === 'light' || t === 'dark' ? t : 'auto'
  }

  #paint() {
    const dark = this.theme === 'dark' || (this.theme === 'auto' && this.#media.matches)
    this.#frame?.classList.toggle('dark', dark)
    if (this.#frame) this.#frame.style.colorScheme = dark ? 'dark' : 'light'
  }

  #render() {
    if (!this.#root) return
    this.#paint()
    this.#root.render(
      <ScreenRecorder
        persist={this.getAttribute('persist') !== 'false'}
        showInTitle={this.getAttribute('title-indicator') === 'true'}
        onRecording={(detail: RecordingResult) =>
          this.dispatchEvent(new CustomEvent('recording', { detail, bubbles: true, composed: true }))
        }
      />,
    )
  }
}

if (!customElements.get('screen-recorder')) customElements.define('screen-recorder', ScreenRecorderElement)

declare global {
  interface HTMLElementTagNameMap {
    'screen-recorder': ScreenRecorderElement
  }
}
