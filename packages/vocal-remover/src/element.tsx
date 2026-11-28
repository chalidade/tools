// <vocal-remover> — the full tool as a custom element for any website.
//
//   <script type="module" src="./dist/element.js"></script>
//   <vocal-remover></vocal-remover>

import { defineToolElement } from '../../_shared/define-element'
import VocalRemover from '@/tools/vocal-remover/VocalRemover'
import css from './element.css?inline'

export const VocalRemoverElement = defineToolElement({ tag: 'vocal-remover', css, render: () => <VocalRemover /> })
