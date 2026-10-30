// <web-whiteboard> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/whiteboard@0/dist/element.js"></script>
//   <web-whiteboard></web-whiteboard>

import { defineToolElement } from '../../_shared/define-element'
import Whiteboard from '@/tools/whiteboard/Whiteboard'
import css from './element.css?inline'

export const WhiteboardElement = defineToolElement({
  tag: 'web-whiteboard',
  css,
  attributes: ['persist'],
  render: (el) => <Whiteboard persist={el.getAttribute('persist') !== 'false'} />,
})
