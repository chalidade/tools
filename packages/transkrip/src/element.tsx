// <speech-to-text> — the full tool as a custom element for any website.
//
//   <script type="module" src="./dist/element.js"></script>
//   <speech-to-text></speech-to-text>

import { defineToolElement } from '../../_shared/define-element'
import Transkrip from '@/tools/transkrip/Transkrip'
import css from './element.css?inline'

export const SpeechToTextElement = defineToolElement({ tag: 'speech-to-text', css, render: () => <Transkrip /> })
