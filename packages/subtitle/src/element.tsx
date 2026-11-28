// <subtitle-editor> — the full tool as a custom element for any website.
//
//   <script type="module" src="./dist/element.js"></script>
//   <subtitle-editor></subtitle-editor>

import { defineToolElement } from '../../_shared/define-element'
import Subtitle from '@/tools/subtitle/Subtitle'
import css from './element.css?inline'

export const SubtitleEditorElement = defineToolElement({ tag: 'subtitle-editor', css, render: () => <Subtitle /> })
