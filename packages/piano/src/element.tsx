// <piano-keyboard> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/piano@0/dist/element.js"></script>
//   <piano-keyboard></piano-keyboard>

import { defineToolElement } from '../../_shared/define-element'
import Piano from '@/tools/piano/Piano'
import css from './element.css?inline'

export const PianoElement = defineToolElement({ tag: 'piano-keyboard', css, render: () => <Piano /> })
