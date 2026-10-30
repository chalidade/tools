// <crop-resize-image> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/crop-resize-image@0/dist/element.js"></script>
//   <crop-resize-image></crop-resize-image>

import { defineToolElement } from '../../_shared/define-element'
import CropResizeImage from '@/tools/crop-resize-image/CropResizeImage'
import css from './element.css?inline'

export const CropResizeImageElement = defineToolElement({ tag: 'crop-resize-image', css, render: () => <CropResizeImage /> })
