// <ppt-to-pdf> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/ppt-to-pdf@0/dist/element.js"></script>
//   <ppt-to-pdf></ppt-to-pdf>

import { defineToolElement } from '../../_shared/define-element'
import PptToPdf from '@/tools/ppt-to-pdf/PptToPdf'
import css from './element.css?inline'

export const PptToPdfElement = defineToolElement({ tag: 'ppt-to-pdf', css, render: () => <PptToPdf /> })
