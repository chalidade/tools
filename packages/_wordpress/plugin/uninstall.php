<?php
/**
 * Removes the plugin's options when it is deleted from Plugins.
 *
 * @package toowl
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

// toowl Image Optimizer, toowl and toowl Pro share these options: keep them while another one is installed.
foreach ( {{OTHER_PLUGINS}} as $toowl_other ) {
	if ( file_exists( WP_PLUGIN_DIR . '/' . $toowl_other ) ) {
		return;
	}
}

delete_option( 'toowl_credit' );
delete_option( 'toowl_license' );
delete_option( 'toowl_optimizer' );
wp_clear_scheduled_hook( 'toowl_license_recheck' );
delete_site_transient( 'toowl_update_info' );
