// <guitar-tuner> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/guitar-tuner@0/dist/element.js"></script>
//   <guitar-tuner></guitar-tuner>

import { defineToolElement } from '../../_shared/define-element'
import GuitarTuner from '@/tools/guitar-tuner/GuitarTuner'
import css from './element.css?inline'

export const GuitarTunerElement = defineToolElement({ tag: 'guitar-tuner', css, render: () => <GuitarTuner /> })
