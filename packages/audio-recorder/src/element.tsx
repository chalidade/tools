// <audio-recorder> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/audio-recorder@0/dist/element.js"></script>
//   <audio-recorder persist="false"></audio-recorder>

import { defineToolElement } from '../../_shared/define-element'
import AudioRecorder from '@/tools/audio-recorder/AudioRecorder'
import css from './element.css?inline'

export const AudioRecorderElement = defineToolElement({
  tag: 'audio-recorder',
  css,
  attributes: ['persist'],
  render: (el) => (
    <AudioRecorder
      persist={el.getAttribute('persist') !== 'false'}
      onRecording={(detail) => el.dispatchEvent(new CustomEvent('recording', { detail, bubbles: true, composed: true }))}
    />
  ),
})
