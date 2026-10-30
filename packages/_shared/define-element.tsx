// Shared by every package's element.tsx: renders a tool's React component
// into a Shadow DOM custom element, so the host page's CSS can't break it and
// its CSS can't leak out. Handles `theme` and `lang`; a package adds its own
// attributes through `attributes` and reads them in `render`.
//
//   defineToolElement({ tag: 'uuid-generator', css, render: () => <Uuid /> })

import type { ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { setLang } from '@/lib/i18n'

/**
 * Tailwind declares its internal variables with `@property`, which a browser
 * only honours at document level — inside a shadow root it is ignored and
 * utilities like `translate-x-4` or `shadow-lg` break. So those rules go to
 * the page head once per page, and the rest stays in the shadow root.
 */
const PROPERTY_RULE = /@property\s+[^{]+\{[^}]*\}/g
function hoistProperties(css: string) {
  if (document.getElementById('chalidade-tools-properties')) return
  const style = document.createElement('style')
  style.id = 'chalidade-tools-properties'
  style.textContent = (css.match(PROPERTY_RULE) ?? []).join('\n')
  document.head.append(style)
}

export type Theme = 'light' | 'dark' | 'auto'

export interface ToolElementOptions {
  tag: string
  /** The package's compiled element.css (`import css from './element.css?inline'`). */
  css: string
  /** Extra observed attributes beyond `theme` and `lang`. */
  attributes?: string[]
  render: (el: HTMLElement) => ReactNode
}

export function defineToolElement({ tag, css, attributes = [], render }: ToolElementOptions) {
  const shadowCss = css.replace(PROPERTY_RULE, '')

  class ToolElement extends HTMLElement {
    static observedAttributes = ['theme', 'lang', ...attributes]

    #root: Root | null = null
    #frame: HTMLDivElement | null = null
    #media = window.matchMedia('(prefers-color-scheme: dark)')
    #onScheme = () => this.#paint()

    connectedCallback() {
      if (!this.#root) {
        hoistProperties(css)
        // Re-attached elements (moved by a framework) keep their shadow root.
        const shadow = this.shadowRoot ?? this.attachShadow({ mode: 'open' })
        const style = document.createElement('style')
        style.textContent = shadowCss
        this.#frame = document.createElement('div')
        // Own background, so theme="dark" stays readable on a light page (and vice versa).
        this.#frame.className = 'sr-frame bg-background text-foreground font-sans antialiased'
        shadow.append(style, this.#frame)
        this.#root = createRoot(this.#frame)
      }
      this.#media.addEventListener('change', this.#onScheme)
      this.#render()
    }

    disconnectedCallback() {
      this.#media.removeEventListener('change', this.#onScheme)
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
      // lang="en" / "id" picks the UI language; without it, the visitor's browser language decides.
      const lang = this.getAttribute('lang')
      if (lang === 'en' || lang === 'id') setLang(lang, { page: false })
      this.#root.render(render(this))
    }
  }

  if (!customElements.get(tag)) customElements.define(tag, ToolElement)
  return ToolElement
}
