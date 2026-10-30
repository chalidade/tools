// <uuid-generator> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/uuid@0/dist/element.js"></script>
//   <uuid-generator></uuid-generator>

import { defineToolElement } from '../../_shared/define-element'
import Uuid from '@/tools/uuid/Uuid'
import css from './element.css?inline'

export const UuidElement = defineToolElement({ tag: 'uuid-generator', css, render: () => <Uuid /> })
