// <chord-finder> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/chords@0/dist/element.js"></script>
//   <chord-finder></chord-finder>

import { defineToolElement } from '../../_shared/define-element'
import Chords from '@/tools/chords/Chords'
import css from './element.css?inline'

export const ChordsElement = defineToolElement({ tag: 'chord-finder', css, render: () => <Chords /> })
