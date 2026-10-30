// <extract-frames> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/extract-frames@0/dist/element.js"></script>
//   <extract-frames></extract-frames>

import { defineToolElement } from '../../_shared/define-element'
import ExtractFrames from '@/tools/extract-frames/ExtractFrames'
import css from './element.css?inline'

export const ExtractFramesElement = defineToolElement({ tag: 'extract-frames', css, render: () => <ExtractFrames /> })
