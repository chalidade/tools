// <json-minify> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/json-minify@0/dist/element.js"></script>
//   <json-minify></json-minify>

import { defineToolElement } from '../../_shared/define-element'
import JsonMinify from '@/tools/json/JsonMinify'
import css from './element.css?inline'

export const JsonMinifyElement = defineToolElement({ tag: 'json-minify', css, render: () => <JsonMinify /> })
