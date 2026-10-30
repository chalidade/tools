// <zakat-calculator> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/zakat@0/dist/element.js"></script>
//   <zakat-calculator></zakat-calculator>

import { defineToolElement } from '../../_shared/define-element'
import Zakat from '@/tools/zakat/Zakat'
import css from './element.css?inline'

export const ZakatElement = defineToolElement({ tag: 'zakat-calculator', css, render: () => <Zakat /> })
