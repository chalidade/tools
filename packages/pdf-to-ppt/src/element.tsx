// <pdf-to-ppt> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/pdf-to-ppt@0/dist/element.js"></script>
//   <pdf-to-ppt></pdf-to-ppt>

import { defineToolElement } from '../../_shared/define-element'
import PdfToPpt from '@/tools/pdf-to-ppt/PdfToPpt'
import css from './element.css?inline'

export const PdfToPptElement = defineToolElement({ tag: 'pdf-to-ppt', css, render: () => <PdfToPpt /> })
