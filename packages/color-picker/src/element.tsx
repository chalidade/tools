// <color-picker> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/color-picker@0/dist/element.js"></script>
//   <color-picker></color-picker>

import { defineToolElement } from '../../_shared/define-element'
import ColorPicker from '@/tools/color-picker/ColorPicker'
import css from './element.css?inline'

export const ColorPickerElement = defineToolElement({ tag: 'color-picker', css, render: () => <ColorPicker /> })
