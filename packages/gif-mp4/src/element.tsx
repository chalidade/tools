// <gif-mp4> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/gif-mp4@0/dist/element.js"></script>
//   <gif-mp4></gif-mp4>

import { defineToolElement } from '../../_shared/define-element'
import GifMp4 from '@/tools/gif-mp4/GifMp4'
import css from './element.css?inline'

export const GifMp4Element = defineToolElement({ tag: 'gif-mp4', css, render: () => <GifMp4 /> })
