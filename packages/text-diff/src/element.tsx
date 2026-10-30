// <text-diff> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/text-diff@0/dist/element.js"></script>
//   <text-diff></text-diff>

import { defineToolElement } from '../../_shared/define-element'
import TextDiff from '@/tools/text-diff/TextDiff'
import css from './element.css?inline'

export const TextDiffElement = defineToolElement({ tag: 'text-diff', css, render: () => <TextDiff /> })
