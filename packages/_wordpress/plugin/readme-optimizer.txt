=== {{PLUGIN_NAME}} ===
Contributors: {{CONTRIBUTORS}}
Donate link: https://trakteer.id/chalidade/tip
Tags: image optimization, compress images, webp, heic, resize images
Requires at least: {{REQUIRES_WP}}
Tested up to: {{TESTED_UP_TO}}
Requires PHP: 7.4
Stable tag: {{VERSION}}
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

{{SHORT_DESCRIPTION}}

== Description ==

Big phone photos make pages slow and fill your hosting. toowl Image Optimizer makes every image smaller **in your browser, before it is uploaded**: your server only receives the optimized file, and there is no third-party compression service, API key or monthly quota.

* **Automatic on upload**: in the block editor, the Media Library and the media window. Drop the photo as usual.
* **Scales down** to a largest side you choose (default 1920 px) and re-encodes at the quality you choose (default 82).
* **WebP** (optional): saves JPEG and PNG uploads as WebP, usually 25–35% smaller, when your server can process WebP.
* **HEIC from iPhone** is turned into JPEG (or WebP) before upload, so it works even where the server can't read HEIC.
* **Privacy**: camera and GPS location data (EXIF) are removed, even from images that were already compact.
* **Images already in your posts**: select an Image block and press "Compress with toowl" in its toolbar. The smaller copy replaces it in the post; the original stays in the Media Library.

Settings: Settings → toowl Image Optimizer.

**Part of toowl**

The free **toowl** plugin includes this optimizer and adds ready-made tools your visitors can use on your pages (QR codes, prayer times and more). **toowl Pro** adds PDF, image, video and audio tools: https://toowl.my.id/embed/

**Source code**

The JavaScript in `assets/dist/` is built from https://github.com/chalidade/tools (`src/tools/compress-image`, `src/tools/convert-image` and `packages/_wordpress`), the same code as https://toowl.my.id/compress-image/. Build it with `node packages/_wordpress/build.mjs optimizer`.

== External services ==

{{EXTERNAL}}

== Frequently Asked Questions ==

= Does it send my images anywhere? =

No. Images are processed by the browser of the person uploading them. Only the optimized file goes to your own WordPress, as any upload does.

= What about images uploaded before I installed it? =

Use "Compress with toowl" on the Image block for the ones that matter. Bulk optimization of the whole library is planned.

= Which formats? =

JPEG, PNG, WebP and HEIC/HEIF. GIF (which may be animated) and SVG are uploaded unchanged.

{{SCREENSHOTS}}== Changelog ==

= {{VERSION}} =
* First release.
