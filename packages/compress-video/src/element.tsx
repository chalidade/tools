// <compress-video> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/compress-video@0/dist/element.js"></script>
//   <compress-video></compress-video>

import { defineToolElement } from '../../_shared/define-element'
import CompressVideo from '@/tools/compress-video/CompressVideo'
import css from './element.css?inline'

export const CompressVideoElement = defineToolElement({ tag: 'compress-video', css, render: () => <CompressVideo /> })
