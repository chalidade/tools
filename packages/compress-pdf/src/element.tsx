// <compress-pdf> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/compress-pdf@0/dist/element.js"></script>
//   <compress-pdf></compress-pdf>

import { defineToolElement } from '../../_shared/define-element'
import CompressPdf from '@/tools/compress-pdf/CompressPdf'
import css from './element.css?inline'

export const CompressPdfElement = defineToolElement({ tag: 'compress-pdf', css, render: () => <CompressPdf /> })
