// <pdf-to-word> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/pdf-to-word@0/dist/element.js"></script>
//   <pdf-to-word></pdf-to-word>

import { defineToolElement } from '../../_shared/define-element'
import PdfToWord from '@/tools/pdf-to-word/PdfToWord'
import css from './element.css?inline'

export const PdfToWordElement = defineToolElement({ tag: 'pdf-to-word', css, render: () => <PdfToWord /> })
