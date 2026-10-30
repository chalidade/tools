// <qibla-direction> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/arah-kiblat@0/dist/element.js"></script>
//   <qibla-direction></qibla-direction>

import { defineToolElement } from '../../_shared/define-element'
import ArahKiblat from '@/tools/arah-kiblat/ArahKiblat'
import css from './element.css?inline'

export const ArahKiblatElement = defineToolElement({ tag: 'qibla-direction', css, render: () => <ArahKiblat /> })
