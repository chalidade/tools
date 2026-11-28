// <remove-object> — the full tool as a custom element for any website.
//
//   <script type="module" src="./dist/element.js"></script>
//   <remove-object></remove-object>

import { defineToolElement } from '../../_shared/define-element'
import RemoveObject from '@/tools/remove-object/RemoveObject'
import css from './element.css?inline'

export const RemoveObjectElement = defineToolElement({ tag: 'remove-object', css, render: () => <RemoveObject /> })
