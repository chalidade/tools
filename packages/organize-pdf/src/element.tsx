// <organize-pdf> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/organize-pdf@0/dist/element.js"></script>
//   <organize-pdf></organize-pdf>

import { defineToolElement } from '../../_shared/define-element'
import OrganizePdf from '@/tools/organize-pdf/OrganizePdf'
import css from './element.css?inline'

export const OrganizePdfElement = defineToolElement({ tag: 'organize-pdf', css, render: () => <OrganizePdf /> })
