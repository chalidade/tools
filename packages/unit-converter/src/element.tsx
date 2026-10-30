// <unit-converter> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/unit-converter@0/dist/element.js"></script>
//   <unit-converter></unit-converter>

import { defineToolElement } from '../../_shared/define-element'
import UnitConverter from '@/tools/unit-converter/UnitConverter'
import css from './element.css?inline'

export const UnitConverterElement = defineToolElement({ tag: 'unit-converter', css, render: () => <UnitConverter /> })
