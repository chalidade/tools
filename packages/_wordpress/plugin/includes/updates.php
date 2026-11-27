<?php
/**
 * Pro: update notices. toowl Pro is not on WordPress.org, so WordPress would
 * never say a new version exists. This reads https://toowl.my.id/wordpress/toowl-pro.json
 * (version, changelog) and adds it to the Plugins screen's update list. There is
 * no download package: buyers get the new ZIP from their Gumroad library, and the
 * notice links there.
 *
 * @package toowl
 */

defined( 'ABSPATH' ) || exit;

const TOOWL_UPDATE_URL = 'https://toowl.my.id/wordpress/toowl-pro.json';

/** The latest release as published, cached 12 hours (a failed fetch is cached 1 hour). */
function toowl_update_info() {
	$info = get_site_transient( 'toowl_update_info' );
	if ( false !== $info ) {
		return $info ? $info : null;
	}
	$response = wp_remote_get( TOOWL_UPDATE_URL, array( 'timeout' => 8 ) );
	$body     = is_wp_error( $response ) || 200 !== wp_remote_retrieve_response_code( $response ) ? null : json_decode( wp_remote_retrieve_body( $response ), true );
	if ( ! is_array( $body ) || empty( $body['version'] ) ) {
		set_site_transient( 'toowl_update_info', 0, HOUR_IN_SECONDS );
		return null;
	}
	set_site_transient( 'toowl_update_info', $body, 12 * HOUR_IN_SECONDS );
	return $body;
}

add_filter(
	'pre_set_site_transient_update_plugins',
	function ( $transient ) {
		if ( ! is_object( $transient ) ) {
			return $transient;
		}
		$info = toowl_update_info();
		$file = plugin_basename( TOOWL_FILE );
		if ( $info && version_compare( $info['version'], TOOWL_VERSION, '>' ) ) {
			$transient->response[ $file ] = (object) array(
				'slug'         => 'toowl-pro',
				'plugin'       => $file,
				'new_version'  => $info['version'],
				'url'          => 'https://toowl.my.id/wordpress/',
				'package'      => '',
				'requires'     => $info['requires'] ?? '',
				'tested'       => $info['tested'] ?? '',
				'requires_php' => $info['requires_php'] ?? '',
			);
		}
		return $transient;
	}
);

// "View version x details": the changelog from the same file.
add_filter(
	'plugins_api',
	function ( $result, $action, $args ) {
		if ( 'plugin_information' !== $action || empty( $args->slug ) || 'toowl-pro' !== $args->slug ) {
			return $result;
		}
		$info = toowl_update_info();
		if ( ! $info ) {
			return $result;
		}
		$changelog = '';
		foreach ( (array) ( $info['changelog'] ?? array() ) as $version => $lines ) {
			$changelog .= '<h4>' . esc_html( $version ) . '</h4><ul>';
			foreach ( (array) $lines as $line ) {
				$changelog .= '<li>' . esc_html( $line ) . '</li>';
			}
			$changelog .= '</ul>';
		}
		return (object) array(
			'name'          => 'toowl Pro',
			'slug'          => 'toowl-pro',
			'version'       => $info['version'],
			'author'        => '<a href="https://toowl.my.id/">Chalid Ade Rahman</a>',
			'homepage'      => 'https://toowl.my.id/wordpress/',
			'requires'      => $info['requires'] ?? '',
			'tested'        => $info['tested'] ?? '',
			'requires_php'  => $info['requires_php'] ?? '',
			'download_link' => '',
			'sections'      => array(
				'changelog'    => $changelog,
				'installation' => '<p>' . esc_html__( 'Download the new ZIP from your Gumroad library (the email from your purchase links it), then Plugins → Add New → Upload Plugin and choose "Replace current with uploaded". Your license and settings stay.', 'toowl' ) . '</p>',
			),
		);
	},
	10,
	3
);

// The update row says where the new ZIP is, since WordPress can't download it.
add_action(
	'in_plugin_update_message-' . plugin_basename( TOOWL_FILE ),
	function () {
		echo ' ' . wp_kses_post(
			sprintf(
				/* translators: %s: link to the Gumroad library. */
				__( 'Download it from %s, then upload it under Plugins → Add New → Upload Plugin.', 'toowl' ),
				'<a href="https://gumroad.com/library" target="_blank" rel="noopener">' . esc_html__( 'your Gumroad library', 'toowl' ) . '</a>'
			)
		);
	}
);
