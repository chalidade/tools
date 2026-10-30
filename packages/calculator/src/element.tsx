// <basic-calculator> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/calculator@0/dist/element.js"></script>
//   <basic-calculator></basic-calculator>

import { defineToolElement } from '../../_shared/define-element'
import Calculator from '@/tools/calculator/Calculator'
import css from './element.css?inline'

export const CalculatorElement = defineToolElement({
  tag: 'basic-calculator',
  css,
  attributes: ['persist'],
  render: (el) => <Calculator persist={el.getAttribute('persist') !== 'false'} />,
})
