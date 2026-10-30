// <qr-reader> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/qr-reader@0/dist/element.js"></script>
//   <qr-reader></qr-reader>

import { defineToolElement } from '../../_shared/define-element'
import QrReader from '@/tools/qr/QrReader'
import css from './element.css?inline'

export const QrReaderElement = defineToolElement({ tag: 'qr-reader', css, render: () => <QrReader /> })
