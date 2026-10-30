// <web-metronome> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/metronome@0/dist/element.js"></script>
//   <web-metronome></web-metronome>

import { defineToolElement } from '../../_shared/define-element'
import Metronome from '@/tools/metronome/Metronome'
import css from './element.css?inline'

export const MetronomeElement = defineToolElement({ tag: 'web-metronome', css, render: () => <Metronome /> })
