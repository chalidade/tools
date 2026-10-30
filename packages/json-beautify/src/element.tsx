// <json-beautify> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/json-beautify@0/dist/element.js"></script>
//   <json-beautify></json-beautify>

import { defineToolElement } from '../../_shared/define-element'
import JsonBeautify from '@/tools/json/JsonBeautify'
import css from './element.css?inline'

export const JsonBeautifyElement = defineToolElement({ tag: 'json-beautify', css, render: () => <JsonBeautify /> })
