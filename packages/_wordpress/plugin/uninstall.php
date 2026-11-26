<?php
/**
 * Removes the plugin's options when it is deleted from Plugins.
 *
 * @package toowl
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

// Free and Pro share these options: keep them while the other one is installed.
if ( file_exists( WP_PLUGIN_DIR . '/{{OTHER_SLUG}}/toowl.php' ) ) {
	return;
}

delete_option( 'toowl_credit' );
delete_option( 'toowl_license' );
wp_clear_scheduled_hook( 'toowl_license_recheck' );
