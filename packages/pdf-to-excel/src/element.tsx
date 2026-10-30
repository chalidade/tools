// <pdf-to-excel> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/pdf-to-excel@0/dist/element.js"></script>
//   <pdf-to-excel></pdf-to-excel>

import { defineToolElement } from '../../_shared/define-element'
import PdfToExcel from '@/tools/pdf-to-excel/PdfToExcel'
import css from './element.css?inline'

export const PdfToExcelElement = defineToolElement({ tag: 'pdf-to-excel', css, render: () => <PdfToExcel /> })
