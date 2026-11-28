// <audio-denoise> — the full tool as a custom element for any website.
//
//   <script type="module" src="./dist/element.js"></script>
//   <audio-denoise></audio-denoise>

import { defineToolElement } from '../../_shared/define-element'
import Denoise from '@/tools/denoise/Denoise'
import css from './element.css?inline'

export const AudioDenoiseElement = defineToolElement({ tag: 'audio-denoise', css, render: () => <Denoise /> })
