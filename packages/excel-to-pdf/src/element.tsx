// <excel-to-pdf> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/excel-to-pdf@0/dist/element.js"></script>
//   <excel-to-pdf></excel-to-pdf>

import { defineToolElement } from '../../_shared/define-element'
import ExcelToPdf from '@/tools/excel-to-pdf/ExcelToPdf'
import css from './element.css?inline'

export const ExcelToPdfElement = defineToolElement({ tag: 'excel-to-pdf', css, render: () => <ExcelToPdf /> })
