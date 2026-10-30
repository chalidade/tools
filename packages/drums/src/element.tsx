// <drum-machine> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/drums@0/dist/element.js"></script>
//   <drum-machine></drum-machine>

import { defineToolElement } from '../../_shared/define-element'
import Drums from '@/tools/drums/Drums'
import css from './element.css?inline'

export const DrumsElement = defineToolElement({ tag: 'drum-machine', css, render: () => <Drums /> })
