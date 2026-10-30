// <bpm-key> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/bpm-key@0/dist/element.js"></script>
//   <bpm-key></bpm-key>

import { defineToolElement } from '../../_shared/define-element'
import BpmKey from '@/tools/bpm-key/BpmKey'
import css from './element.css?inline'

export const BpmKeyElement = defineToolElement({ tag: 'bpm-key', css, render: () => <BpmKey /> })
