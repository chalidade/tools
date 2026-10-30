// <encode-decode> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/encode-decode@0/dist/element.js"></script>
//   <encode-decode></encode-decode>

import { defineToolElement } from '../../_shared/define-element'
import EncodeDecode from '@/tools/encode-decode/EncodeDecode'
import css from './element.css?inline'

export const EncodeDecodeElement = defineToolElement({ tag: 'encode-decode', css, render: () => <EncodeDecode /> })
