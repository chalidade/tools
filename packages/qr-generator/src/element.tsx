// <qr-generator> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/qr-generator@0/dist/element.js"></script>
//   <qr-generator></qr-generator>

import { defineToolElement } from '../../_shared/define-element'
import QrGenerator from '@/tools/qr/QrGenerator'
import css from './element.css?inline'

export const QrGeneratorElement = defineToolElement({ tag: 'qr-generator', css, render: () => <QrGenerator /> })
