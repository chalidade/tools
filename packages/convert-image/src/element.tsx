// <convert-image> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/convert-image@0/dist/element.js"></script>
//   <convert-image></convert-image>

import { defineToolElement } from '../../_shared/define-element'
import ConvertImage from '@/tools/convert-image/ConvertImage'
import css from './element.css?inline'

export const ConvertImageElement = defineToolElement({ tag: 'convert-image', css, render: () => <ConvertImage /> })
