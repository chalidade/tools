// <terbilang-converter> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/terbilang@0/dist/element.js"></script>
//   <terbilang-converter></terbilang-converter>

import { defineToolElement } from '../../_shared/define-element'
import Terbilang from '@/tools/terbilang/Terbilang'
import css from './element.css?inline'

export const TerbilangElement = defineToolElement({ tag: 'terbilang-converter', css, render: () => <Terbilang /> })
