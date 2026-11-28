// <image-to-text> — the full tool as a custom element for any website.
//
//   <script type="module" src="./dist/element.js"></script>
//   <image-to-text></image-to-text>

import { defineToolElement } from '../../_shared/define-element'
import Ocr from '@/tools/ocr/Ocr'
import css from './element.css?inline'

export const ImageToTextElement = defineToolElement({ tag: 'image-to-text', css, render: () => <Ocr /> })
