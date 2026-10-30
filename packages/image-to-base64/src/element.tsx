// <image-to-base64> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/image-to-base64@0/dist/element.js"></script>
//   <image-to-base64></image-to-base64>

import { defineToolElement } from '../../_shared/define-element'
import ImageToBase64 from '@/tools/image-to-base64/ImageToBase64'
import css from './element.css?inline'

export const ImageToBase64Element = defineToolElement({ tag: 'image-to-base64', css, render: () => <ImageToBase64 /> })
