// <remove-background> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/remove-background@0/dist/element.js"></script>
//   <remove-background></remove-background>

import { defineToolElement } from '../../_shared/define-element'
import RemoveBackground from '@/tools/remove-background/RemoveBackground'
import css from './element.css?inline'

export const RemoveBackgroundElement = defineToolElement({ tag: 'remove-background', css, render: () => <RemoveBackground /> })
