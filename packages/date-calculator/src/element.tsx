// <date-calculator> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/date-calculator@0/dist/element.js"></script>
//   <date-calculator></date-calculator>

import { defineToolElement } from '../../_shared/define-element'
import DateCalculator from '@/tools/date-calculator/DateCalculator'
import css from './element.css?inline'

export const DateCalculatorElement = defineToolElement({ tag: 'date-calculator', css, render: () => <DateCalculator /> })
