// <chord-progression> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/chord-progression@0/dist/element.js"></script>
//   <chord-progression></chord-progression>

import { defineToolElement } from '../../_shared/define-element'
import ChordProgression from '@/tools/chord-progression/ChordProgression'
import css from './element.css?inline'

export const ChordProgressionElement = defineToolElement({ tag: 'chord-progression', css, render: () => <ChordProgression /> })
