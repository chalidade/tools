// <image-to-pdf> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/image-to-pdf@0/dist/element.js"></script>
//   <image-to-pdf></image-to-pdf>

import { defineToolElement } from '../../_shared/define-element'
import ImageToPdf from '@/tools/image-to-pdf/ImageToPdf'
import css from './element.css?inline'

export const ImageToPdfElement = defineToolElement({ tag: 'image-to-pdf', css, render: () => <ImageToPdf /> })
