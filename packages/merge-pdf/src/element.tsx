// <merge-pdf> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/merge-pdf@0/dist/element.js"></script>
//   <merge-pdf></merge-pdf>

import { defineToolElement } from '../../_shared/define-element'
import MergePdf from '@/tools/merge-pdf/MergePdf'
import css from './element.css?inline'

export const MergePdfElement = defineToolElement({ tag: 'merge-pdf', css, render: () => <MergePdf /> })
