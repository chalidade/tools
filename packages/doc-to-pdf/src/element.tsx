// <doc-to-pdf> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/doc-to-pdf@0/dist/element.js"></script>
//   <doc-to-pdf></doc-to-pdf>

import { defineToolElement } from '../../_shared/define-element'
import DocToPdf from '@/tools/doc-to-pdf/DocToPdf'
import css from './element.css?inline'

export const DocToPdfElement = defineToolElement({ tag: 'doc-to-pdf', css, render: () => <DocToPdf /> })
