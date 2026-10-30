# Third-party notices

The files in `dist/` bundle the following open-source software, unmodified.

| Package | License | Source |
| --- | --- | --- |
| React, React DOM | MIT | https://github.com/facebook/react |
| jsPDF | MIT | https://github.com/parallax/jsPDF |
| fflate | MIT | https://github.com/101arrowz/fflate |
| html2canvas (and css-line-break, text-segmentation, utrie, base64-arraybuffer) | MIT | https://github.com/niklasvh/html2canvas |
| DOMPurify (used under Apache-2.0) | MPL-2.0 OR Apache-2.0 | https://github.com/cure53/DOMPurify |
| canvg (and core-js, raf, rgbcolor, stackblur-canvas, svg-pathdata, performance-now, @babel/runtime) | MIT | https://github.com/canvg/canvg |
| lucide-react | ISC | https://github.com/lucide-icons/lucide |
| Tailwind CSS (compiled styles) | MIT | https://github.com/tailwindlabs/tailwindcss |
| tw-animate-css | MIT | https://github.com/Wombosvideo/tw-animate-css |
| clsx | MIT | https://github.com/lukeed/clsx |
| tailwind-merge | MIT | https://github.com/dcastil/tailwind-merge |
| class-variance-authority | Apache-2.0 | https://github.com/joe-bell/cva |

jsPDF loads only when a sheet is saved as PDF; html2canvas, DOMPurify and canvg
are optional jsPDF modules that this package never calls, bundled so that no
import is left unresolved.

The full license texts are in each project's repository.
