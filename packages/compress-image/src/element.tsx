// <compress-image> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/compress-image@0/dist/element.js"></script>
//   <compress-image></compress-image>

import { defineToolElement } from '../../_shared/define-element'
import CompressImage from '@/tools/compress-image/CompressImage'
import css from './element.css?inline'

export const CompressImageElement = defineToolElement({ tag: 'compress-image', css, render: () => <CompressImage /> })
