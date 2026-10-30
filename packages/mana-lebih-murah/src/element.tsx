// <unit-price-compare> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/mana-lebih-murah@0/dist/element.js"></script>
//   <unit-price-compare></unit-price-compare>

import { defineToolElement } from '../../_shared/define-element'
import ManaLebihMurah from '@/tools/mana-lebih-murah/ManaLebihMurah'
import css from './element.css?inline'

export const ManaLebihMurahElement = defineToolElement({ tag: 'unit-price-compare', css, render: () => <ManaLebihMurah /> })
