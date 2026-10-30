// <markdown-notes> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/notes@0/dist/element.js"></script>
//   <markdown-notes></markdown-notes>

import { defineToolElement } from '../../_shared/define-element'
import Notes from '@/tools/notes/Notes'
import css from './element.css?inline'

export const NotesElement = defineToolElement({
  tag: 'markdown-notes',
  css,
  attributes: ['persist'],
  render: (el) => <Notes persist={el.getAttribute('persist') !== 'false'} />,
})
