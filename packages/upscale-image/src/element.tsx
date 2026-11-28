// <upscale-image> — the full tool as a custom element for any website.
//
//   <script type="module" src="./dist/element.js"></script>
//   <upscale-image></upscale-image>

import { defineToolElement } from '../../_shared/define-element'
import UpscaleImage from '@/tools/upscale-image/UpscaleImage'
import css from './element.css?inline'

export const UpscaleImageElement = defineToolElement({ tag: 'upscale-image', css, render: () => <UpscaleImage /> })
