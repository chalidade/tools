// <pas-foto> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/pas-foto@0/dist/element.js"></script>
//   <pas-foto></pas-foto>

import { defineToolElement } from '../../_shared/define-element'
import PasFoto from '@/tools/pas-foto/PasFoto'
import css from './element.css?inline'

export const PasFotoElement = defineToolElement({ tag: 'pas-foto', css, render: () => <PasFoto /> })
