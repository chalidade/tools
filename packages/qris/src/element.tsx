// <qris-amount> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/qris@0/dist/element.js"></script>
//   <qris-amount></qris-amount>

import { defineToolElement } from '../../_shared/define-element'
import Qris from '@/tools/qris/Qris'
import css from './element.css?inline'

export const QrisElement = defineToolElement({ tag: 'qris-amount', css, render: () => <Qris /> })
