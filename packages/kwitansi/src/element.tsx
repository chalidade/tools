// <receipt-invoice> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/kwitansi@0/dist/element.js"></script>
//   <receipt-invoice></receipt-invoice>
//   <receipt-invoice persist="false"></receipt-invoice>   <!-- keep nothing in localStorage -->

import { defineToolElement } from '../../_shared/define-element'
import Kwitansi from '@/tools/kwitansi/Kwitansi'
import css from './element.css?inline'

export const KwitansiElement = defineToolElement({
  tag: 'receipt-invoice',
  css,
  attributes: ['persist'],
  render: (el) => <Kwitansi persist={el.getAttribute('persist') !== 'false'} />,
})
