// <favicon-generator> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/favicon-generator@0/dist/element.js"></script>
//   <favicon-generator></favicon-generator>

import { defineToolElement } from '../../_shared/define-element'
import FaviconGenerator from '@/tools/favicon-generator/FaviconGenerator'
import css from './element.css?inline'

export const FaviconGeneratorElement = defineToolElement({ tag: 'favicon-generator', css, render: () => <FaviconGenerator /> })
