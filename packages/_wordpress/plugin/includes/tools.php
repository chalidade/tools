<?php
/**
 * The tools in this build (assets/tools.json, written by build.mjs), and the
 * block + shortcode that place them.
 *
 * @package toowl
 */

defined( 'ABSPATH' ) || exit;

/**
 * Every tool in this ZIP, by slug.
 *
 * @return array<string, array{tag: string, title: array{id: string, en: string}, description: array{id: string, en: string}, category: string, free: bool}>
 */
function toowl_tools() {
	static $tools = null;
	if ( null === $tools ) {
		$json  = file_get_contents( TOOWL_DIR . '/assets/tools.json' ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local file.
		$tools = json_decode( (string) $json, true );
		if ( ! is_array( $tools ) ) {
			$tools = array();
		}
	}
	return $tools;
}

/** 'id' when the site (or the admin's profile) speaks Indonesian, else 'en'. */
function toowl_lang() {
	$locale = is_admin() ? get_user_locale() : get_locale();
	return 0 === strpos( $locale, 'id' ) || 0 === strpos( $locale, 'ms' ) ? 'id' : 'en';
}

/** A tool's title or description in the site's language. */
function toowl_text( array $tool, $field ) {
	return $tool[ $field ][ toowl_lang() ] ?? $tool[ $field ]['en'];
}

/** Free tools always work; the rest need a license that covers them (Pro only). */
function toowl_tool_unlocked( $slug ) {
	$tools = toowl_tools();
	if ( ! isset( $tools[ $slug ] ) ) {
		return false;
	}
	if ( ! empty( $tools[ $slug ]['free'] ) ) {
		return true;
	}
	return function_exists( 'toowl_license_covers' ) && toowl_license_covers( $slug );
}

/** Registers the block (one variation per tool), the shortcode and the front-end style. */
function toowl_register() {
	$tools      = toowl_tools();
	$variations = array();
	foreach ( $tools as $slug => $tool ) {
		$variations[] = array(
			'name'        => $slug,
			'title'       => toowl_text( $tool, 'title' ),
			'description' => toowl_text( $tool, 'description' ),
			'attributes'  => array( 'tool' => $slug ),
			'scope'       => array( 'inserter', 'transform' ),
			'isActive'    => array( 'tool' ),
			'keywords'    => array( 'toowl', $slug ),
		);
	}

	register_block_type(
		TOOWL_DIR . '/blocks/tool',
		array(
			'render_callback' => 'toowl_render_block',
			'variations'      => $variations,
		)
	);

	// What the editor needs to draw a tool's placeholder (see blocks/tool/editor.js).
	$editor = array();
	foreach ( $tools as $slug => $tool ) {
		$editor[ $slug ] = array(
			'title'       => toowl_text( $tool, 'title' ),
			'description' => toowl_text( $tool, 'description' ),
			'locked'      => ! toowl_tool_unlocked( $slug ),
		);
	}
	wp_add_inline_script(
		'toowl-tool-editor-script',
		'window.toowlEditor = ' . wp_json_encode(
			array(
				'tools'       => $editor,
				'edition'     => TOOWL_EDITION,
				'settingsUrl' => admin_url( 'options-general.php?page=toowl' ),
			)
		) . ';',
		'before'
	);

	add_shortcode( 'toowl', 'toowl_shortcode' );
	wp_register_style( 'toowl', plugins_url( 'assets/toowl.css', TOOWL_FILE ), array(), TOOWL_VERSION );
}

// The blocks get a category of their own in the inserter.
add_filter(
	'block_categories_all',
	function ( $categories ) {
		array_unshift(
			$categories,
			array(
				'slug'  => 'toowl',
				'title' => 'toowl',
				'icon'  => null,
			)
		);
		return $categories;
	}
);
