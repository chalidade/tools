// <watermark-pdf> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/watermark-pdf@0/dist/element.js"></script>
//   <watermark-pdf></watermark-pdf>

import { defineToolElement } from '../../_shared/define-element'
import WatermarkPdf from '@/tools/watermark-pdf/WatermarkPdf'
import css from './element.css?inline'

export const WatermarkPdfElement = defineToolElement({ tag: 'watermark-pdf', css, render: () => <WatermarkPdf /> })
