// <link-wa> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/link-wa@0/dist/element.js"></script>
//   <link-wa></link-wa>

import { defineToolElement } from '../../_shared/define-element'
import LinkWa from '@/tools/link-wa/LinkWa'
import css from './element.css?inline'

export const LinkWaElement = defineToolElement({ tag: 'link-wa', css, render: () => <LinkWa /> })
