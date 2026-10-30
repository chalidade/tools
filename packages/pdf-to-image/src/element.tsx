// <pdf-to-image> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/pdf-to-image@0/dist/element.js"></script>
//   <pdf-to-image></pdf-to-image>

import { defineToolElement } from '../../_shared/define-element'
import PdfToImage from '@/tools/pdf-to-image/PdfToImage'
import css from './element.css?inline'

export const PdfToImageElement = defineToolElement({ tag: 'pdf-to-image', css, render: () => <PdfToImage /> })
