// <pdf-to-markdown> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/pdf-to-markdown@0/dist/element.js"></script>
//   <pdf-to-markdown></pdf-to-markdown>

import { defineToolElement } from '../../_shared/define-element'
import PdfToMarkdown from '@/tools/pdf-to-markdown/PdfToMarkdown'
import css from './element.css?inline'

export const PdfToMarkdownElement = defineToolElement({ tag: 'pdf-to-markdown', css, render: () => <PdfToMarkdown /> })
