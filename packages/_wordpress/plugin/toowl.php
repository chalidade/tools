<?php
/**
 * Plugin Name:       {{PLUGIN_NAME}}
 * Plugin URI:        {{PLUGIN_URI}}
 * Description:       {{PLUGIN_DESCRIPTION}}
 * Version:           {{VERSION}}
 * Requires at least: {{REQUIRES_WP}}
 * Requires PHP:      7.4
 * Author:            Chalid Ade Rahman
 * Author URI:        https://toowl.my.id/
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       {{TEXT_DOMAIN}}
 *
 * Browser-only tools (PDF, image, QR, prayer times, ...) as Gutenberg blocks
 * and a [toowl] shortcode. Every tool runs in the visitor's browser: files are
 * never uploaded, to this site or anywhere else.
 */

defined( 'ABSPATH' ) || exit;

// toowl Image Optimizer, toowl (free) and toowl Pro share their code, each a
// superset of the one before; only the widest active one runs.
if ( defined( 'TOOWL_FILE' ) ) {
	return;
}
$toowl_active = array_merge( (array) get_option( 'active_plugins', array() ), array_keys( (array) get_site_option( 'active_sitewide_plugins', array() ) ) );
foreach ( {{WIDER_PLUGINS}} as $toowl_wider ) {
	if ( in_array( $toowl_wider, $toowl_active, true ) ) {
		return;
	}
}
unset( $toowl_active, $toowl_wider );

define( 'TOOWL_FILE', __FILE__ );
define( 'TOOWL_DIR', __DIR__ );
define( 'TOOWL_VERSION', '{{VERSION}}' );
/** 'optimizer' (toowl Image Optimizer), 'free' (toowl on WordPress.org) or 'pro'. */
define( 'TOOWL_EDITION', '{{EDITION}}' );

require __DIR__ . '/includes/tools.php';
require __DIR__ . '/includes/render.php';
if ( file_exists( __DIR__ . '/includes/optimizer.php' ) ) {
	require __DIR__ . '/includes/optimizer.php';
}
require __DIR__ . '/includes/admin.php';
if ( file_exists( __DIR__ . '/includes/license.php' ) ) {
	require __DIR__ . '/includes/license.php';
}
if ( file_exists( __DIR__ . '/includes/updates.php' ) ) {
	require __DIR__ . '/includes/updates.php';
}

add_action( 'init', 'toowl_register' );

// A wider edition switches the narrower ones off (it already contains them; settings are shared).
// Not in an activation hook: activate_plugin() saves its stale list after the hook runs.
add_action(
	'admin_init',
	function () {
		if ( ! current_user_can( 'activate_plugins' ) ) {
			return;
		}
		if ( ! function_exists( 'is_plugin_active' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}
		foreach ( {{NARROWER_PLUGINS}} as $plugin ) {
			if ( is_plugin_active( $plugin ) ) {
				deactivate_plugins( $plugin, true );
			}
		}
	}
);
if ( function_exists( 'toowl_license_unschedule' ) ) {
	register_deactivation_hook( __FILE__, 'toowl_license_unschedule' );
}
