# Third-party notices

The files in `dist/` bundle the following open-source software, unmodified.

| Package | License | Source |
| --- | --- | --- |
| React, React DOM | MIT | https://github.com/facebook/react |
| libheif-js (libheif and libde265 compiled to WebAssembly) | LGPL-3.0 | https://github.com/catdad-experiments/libheif-js |
| JSZip (used under MIT; bundles pako, lie, setimmediate, readable-stream) | MIT OR GPL-3.0-or-later; pako: MIT AND Zlib | https://github.com/Stuk/jszip |
| lucide-react | ISC | https://github.com/lucide-icons/lucide |
| Tailwind CSS (compiled styles) | MIT | https://github.com/tailwindlabs/tailwindcss |
| tw-animate-css | MIT | https://github.com/Wombosvideo/tw-animate-css |
| clsx | MIT | https://github.com/lukeed/clsx |
| tailwind-merge | MIT | https://github.com/dcastil/tailwind-merge |
| class-variance-authority | Apache-2.0 | https://github.com/joe-bell/cva |

libheif-js is licensed under the GNU Lesser General Public License 3.0. It is
used without modification and kept in its own file (`dist/chunks/libheif-bundle-*.js`),
loaded only when a HEIC/HEIF image is opened, so it can be replaced with another
build; its source code is available at the address above.

JSZip is dual-licensed; this package uses it under the MIT license.

The full license texts are in each project's repository.
