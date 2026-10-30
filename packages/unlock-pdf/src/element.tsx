// <unlock-pdf> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/unlock-pdf@0/dist/element.js"></script>
//   <unlock-pdf></unlock-pdf>

import { defineToolElement } from '../../_shared/define-element'
import UnlockPdf from '@/tools/unlock-pdf/UnlockPdf'
import css from './element.css?inline'

export const UnlockPdfElement = defineToolElement({ tag: 'unlock-pdf', css, render: () => <UnlockPdf /> })
