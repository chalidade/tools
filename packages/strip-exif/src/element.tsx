// <strip-exif> — the full tool as a custom element for any website.
//
//   <script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/strip-exif@0/dist/element.js"></script>
//   <strip-exif></strip-exif>

import { defineToolElement } from '../../_shared/define-element'
import StripExif from '@/tools/strip-exif/StripExif'
import css from './element.css?inline'

export const StripExifElement = defineToolElement({ tag: 'strip-exif', css, render: () => <StripExif /> })
