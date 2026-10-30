// <take-home-pay> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/gaji-bersih@0/dist/element.js"></script>
//   <take-home-pay></take-home-pay>

import { defineToolElement } from '../../_shared/define-element'
import GajiBersih from '@/tools/gaji-bersih/GajiBersih'
import css from './element.css?inline'

export const GajiBersihElement = defineToolElement({ tag: 'take-home-pay', css, render: () => <GajiBersih /> })
