// <loan-calculator> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/cicilan@0/dist/element.js"></script>
//   <loan-calculator></loan-calculator>

import { defineToolElement } from '../../_shared/define-element'
import Cicilan from '@/tools/cicilan/Cicilan'
import css from './element.css?inline'

export const CicilanElement = defineToolElement({ tag: 'loan-calculator', css, render: () => <Cicilan /> })
