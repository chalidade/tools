// <sign-pdf> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/sign-pdf@0/dist/element.js"></script>
//   <sign-pdf></sign-pdf>

import { defineToolElement } from '../../_shared/define-element'
import SignPdf from '@/tools/sign-pdf/SignPdf'
import css from './element.css?inline'

export const SignPdfElement = defineToolElement({ tag: 'sign-pdf', css, render: () => <SignPdf /> })
