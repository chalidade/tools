<?php
/**
 * Plugin Name:       {{PLUGIN_NAME}}
 * Plugin URI:        https://toowl.my.id/
 * Description:       {{PLUGIN_DESCRIPTION}}
 * Version:           {{VERSION}}
 * Requires at least: 6.5
 * Requires PHP:      7.4
 * Author:            Chalid Ade Rahman
 * Author URI:        https://toowl.my.id/
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       toowl
 *
 * Browser-only tools (PDF, image, QR, prayer times, ...) as Gutenberg blocks
 * and a [toowl] shortcode. Every tool runs in the visitor's browser: files are
 * never uploaded, to this site or anywhere else.
 */

defined( 'ABSPATH' ) || exit;

// Free and Pro share their code; only one may run. Pro wins.
if ( defined( 'TOOWL_FILE' ) ) {
	return;
}
if ( '{{EDITION}}' === 'free' && in_array( 'toowl-pro/toowl.php', (array) get_option( 'active_plugins', array() ), true ) ) {
	return;
}

define( 'TOOWL_FILE', __FILE__ );
define( 'TOOWL_DIR', __DIR__ );
define( 'TOOWL_VERSION', '{{VERSION}}' );
/** 'free' (WordPress.org) or 'pro'. */
define( 'TOOWL_EDITION', '{{EDITION}}' );

require __DIR__ . '/includes/tools.php';
require __DIR__ . '/includes/render.php';
require __DIR__ . '/includes/admin.php';
if ( file_exists( __DIR__ . '/includes/license.php' ) ) {
	require __DIR__ . '/includes/license.php';
}

add_action( 'init', 'toowl_register' );

if ( 'pro' === TOOWL_EDITION ) {
	// The free plugin is a subset: switch it off once Pro runs. (Not in an
	// activation hook: activate_plugin() saves its stale list after the hook.)
	add_action(
		'admin_init',
		function () {
			if ( ! function_exists( 'is_plugin_active' ) ) {
				require_once ABSPATH . 'wp-admin/includes/plugin.php';
			}
			if ( is_plugin_active( 'toowl/toowl.php' ) && current_user_can( 'activate_plugins' ) ) {
				deactivate_plugins( 'toowl/toowl.php', true );
			}
		}
	);
	register_deactivation_hook( __FILE__, 'toowl_license_unschedule' );
}
