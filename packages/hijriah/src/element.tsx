// <hijri-calendar> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/hijriah@0/dist/element.js"></script>
//   <hijri-calendar></hijri-calendar>

import { defineToolElement } from '../../_shared/define-element'
import Hijriah from '@/tools/hijriah/Hijriah'
import css from './element.css?inline'

export const HijriahElement = defineToolElement({ tag: 'hijri-calendar', css, render: () => <Hijriah /> })
