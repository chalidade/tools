// <change-speed> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/change-speed@0/dist/element.js"></script>
//   <change-speed></change-speed>

import { defineToolElement } from '../../_shared/define-element'
import ChangeSpeed from '@/tools/change-speed/ChangeSpeed'
import css from './element.css?inline'

export const ChangeSpeedElement = defineToolElement({ tag: 'change-speed', css, render: () => <ChangeSpeed /> })
