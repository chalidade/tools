// <merge-audio> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/merge-audio@0/dist/element.js"></script>
//   <merge-audio></merge-audio>

import { defineToolElement } from '../../_shared/define-element'
import MergeAudio from '@/tools/merge-audio/MergeAudio'
import css from './element.css?inline'

export const MergeAudioElement = defineToolElement({ tag: 'merge-audio', css, render: () => <MergeAudio /> })
