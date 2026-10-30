// <practice-recorder> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/practice-recorder@0/dist/element.js"></script>
//   <practice-recorder></practice-recorder>

import { defineToolElement } from '../../_shared/define-element'
import PracticeRecorder from '@/tools/practice-recorder/PracticeRecorder'
import css from './element.css?inline'

export const PracticeRecorderElement = defineToolElement({ tag: 'practice-recorder', css, render: () => <PracticeRecorder /> })
