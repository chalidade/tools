// <image-to-svg> — the full tool as a custom element for any website.
//
//   <script type="module" src="./dist/element.js"></script>
//   <image-to-svg></image-to-svg>

import { defineToolElement } from '../../_shared/define-element'
import ImageToSvg from '@/tools/image-to-svg/ImageToSvg'
import css from './element.css?inline'

export const ImageToSvgElement = defineToolElement({ tag: 'image-to-svg', css, render: () => <ImageToSvg /> })
