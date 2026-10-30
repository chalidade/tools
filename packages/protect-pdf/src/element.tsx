// <protect-pdf> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/protect-pdf@0/dist/element.js"></script>
//   <protect-pdf></protect-pdf>

import { defineToolElement } from '../../_shared/define-element'
import ProtectPdf from '@/tools/protect-pdf/ProtectPdf'
import css from './element.css?inline'

export const ProtectPdfElement = defineToolElement({ tag: 'protect-pdf', css, render: () => <ProtectPdf /> })
