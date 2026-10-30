// <tasbih-counter> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/tasbih@0/dist/element.js"></script>
//   <tasbih-counter></tasbih-counter>

import { defineToolElement } from '../../_shared/define-element'
import Tasbih from '@/tools/tasbih/Tasbih'
import css from './element.css?inline'

export const TasbihElement = defineToolElement({
  tag: 'tasbih-counter',
  css,
  attributes: ['persist'],
  render: (el) => <Tasbih persist={el.getAttribute('persist') !== 'false'} />,
})
