// <prayer-times> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/jadwal-sholat@0/dist/element.js"></script>
//   <prayer-times></prayer-times>

import { defineToolElement } from '../../_shared/define-element'
import JadwalSholat from '@/tools/jadwal-sholat/JadwalSholat'
import css from './element.css?inline'

export const JadwalSholatElement = defineToolElement({ tag: 'prayer-times', css, render: () => <JadwalSholat /> })
