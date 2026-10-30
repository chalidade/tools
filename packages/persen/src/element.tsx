// <percent-calculator> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/persen@0/dist/element.js"></script>
//   <percent-calculator></percent-calculator>

import { defineToolElement } from '../../_shared/define-element'
import Persen from '@/tools/persen/Persen'
import css from './element.css?inline'

export const PersenElement = defineToolElement({ tag: 'percent-calculator', css, render: () => <Persen /> })
