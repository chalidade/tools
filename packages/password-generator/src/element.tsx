// <password-generator> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/password-generator@0/dist/element.js"></script>
//   <password-generator></password-generator>

import { defineToolElement } from '../../_shared/define-element'
import PasswordGenerator from '@/tools/password-generator/PasswordGenerator'
import css from './element.css?inline'

export const PasswordGeneratorElement = defineToolElement({ tag: 'password-generator', css, render: () => <PasswordGenerator /> })
