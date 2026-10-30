// <split-pdf> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/split-pdf@0/dist/element.js"></script>
//   <split-pdf></split-pdf>

import { defineToolElement } from '../../_shared/define-element'
import SplitPdf from '@/tools/split-pdf/SplitPdf'
import css from './element.css?inline'

export const SplitPdfElement = defineToolElement({ tag: 'split-pdf', css, render: () => <SplitPdf /> })
