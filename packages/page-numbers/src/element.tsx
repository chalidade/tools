// <page-numbers> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/page-numbers@0/dist/element.js"></script>
//   <page-numbers></page-numbers>

import { defineToolElement } from '../../_shared/define-element'
import PageNumbers from '@/tools/page-numbers/PageNumbers'
import css from './element.css?inline'

export const PageNumbersElement = defineToolElement({ tag: 'page-numbers', css, render: () => <PageNumbers /> })
