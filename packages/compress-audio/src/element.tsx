// <compress-audio> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/compress-audio@0/dist/element.js"></script>
//   <compress-audio></compress-audio>

import { defineToolElement } from '../../_shared/define-element'
import CompressAudio from '@/tools/compress-audio/CompressAudio'
import css from './element.css?inline'

export const CompressAudioElement = defineToolElement({ tag: 'compress-audio', css, render: () => <CompressAudio /> })
