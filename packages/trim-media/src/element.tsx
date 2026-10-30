// <trim-media> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/trim-media@0/dist/element.js"></script>
//   <trim-media></trim-media>

import { defineToolElement } from '../../_shared/define-element'
import TrimMedia from '@/tools/trim-media/TrimMedia'
import css from './element.css?inline'

export const TrimMediaElement = defineToolElement({ tag: 'trim-media', css, render: () => <TrimMedia /> })
