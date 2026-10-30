// <word-counter> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/word-counter@0/dist/element.js"></script>
//   <word-counter></word-counter>

import { defineToolElement } from '../../_shared/define-element'
import WordCounter from '@/tools/word-counter/WordCounter'
import css from './element.css?inline'

export const WordCounterElement = defineToolElement({ tag: 'word-counter', css, render: () => <WordCounter /> })
