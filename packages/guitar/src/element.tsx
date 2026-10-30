// <virtual-guitar> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/guitar@0/dist/element.js"></script>
//   <virtual-guitar></virtual-guitar>

import { defineToolElement } from '../../_shared/define-element'
import Guitar from '@/tools/guitar/Guitar'
import css from './element.css?inline'

export const GuitarElement = defineToolElement({ tag: 'virtual-guitar', css, render: () => <Guitar /> })
