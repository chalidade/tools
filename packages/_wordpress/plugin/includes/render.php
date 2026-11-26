<?php
/**
 * Front end: the block and the shortcode both print a tool's custom element
 * (e.g. <compress-pdf>) and load its ES module from this plugin's own folder.
 * Nothing is loaded from a CDN; the tool runs entirely in the visitor's browser.
 *
 * @package toowl
 */

defined( 'ABSPATH' ) || exit;

/** Block render callback. */
function toowl_render_block( $attributes ) {
	$attributes = is_array( $attributes ) ? $attributes : array();
	$wrapper    = function_exists( 'get_block_wrapper_attributes' ) ? get_block_wrapper_attributes() : '';
	return toowl_render_tool( $attributes, $wrapper );
}

/**
 * [toowl tool="compress-pdf" theme="dark" lang="en"]
 *
 * @param array|string $atts Shortcode attributes.
 */
function toowl_shortcode( $atts ) {
	$atts = shortcode_atts(
		array(
			'tool'  => '',
			'theme' => 'auto',
			'lang'  => '',
		),
		$atts,
		'toowl'
	);
	return toowl_render_tool( $atts, 'class="toowl-tool"' );
}

/**
 * The element for one tool, or '' (a notice for editors) when it can't be shown.
 *
 * @param array  $atts    tool, theme (auto|light|dark), lang (''|en|id).
 * @param string $wrapper Attributes for the wrapping <div>, already escaped.
 */
function toowl_render_tool( array $atts, $wrapper = '' ) {
	$tools = toowl_tools();
	$slug  = sanitize_key( $atts['tool'] ?? '' );

	if ( ! isset( $tools[ $slug ] ) ) {
		/* translators: %s: the tool name that was asked for. */
		return toowl_editor_notice( sprintf( __( 'toowl: there is no tool called "%s" in this plugin.', 'toowl' ), $slug ) );
	}
	$tool = $tools[ $slug ];

	if ( ! toowl_tool_unlocked( $slug ) ) {
		return toowl_editor_notice(
			sprintf(
				/* translators: 1: tool name, 2: link to the settings page. */
				__( 'toowl: %1$s needs a license that covers it, so visitors don\'t see it yet. %2$s', 'toowl' ),
				esc_html( toowl_text( $tool, 'title' ) ),
				'<a href="' . esc_url( admin_url( 'options-general.php?page=toowl' ) ) . '">' . esc_html__( 'Enter a license key', 'toowl' ) . '</a>'
			),
			false
		);
	}

	wp_enqueue_script_module( 'toowl-' . $slug, plugins_url( 'assets/dist/elements/' . $slug . '.js', TOOWL_FILE ), array(), TOOWL_VERSION );
	wp_enqueue_style( 'toowl' );

	$theme = in_array( $atts['theme'] ?? '', array( 'light', 'dark' ), true ) ? $atts['theme'] : 'auto';
	$lang  = in_array( $atts['lang'] ?? '', array( 'en', 'id' ), true ) ? $atts['lang'] : toowl_lang();
	$tag   = $tool['tag'];

	$html  = '<div ' . ( $wrapper ? $wrapper : 'class="toowl-tool"' ) . ' data-toowl-tool="' . esc_attr( $slug ) . '">';
	$html .= '<' . tag_escape( $tag ) . ' theme="' . esc_attr( $theme ) . '" lang="' . esc_attr( $lang ) . '"></' . tag_escape( $tag ) . '>';
	$html .= toowl_credit( $slug, $lang );
	$html .= '</div>';
	return $html;
}

/**
 * "Made with toowl" under a tool. WordPress.org forbids credit links the site
 * owner didn't opt in to, so it shows only when they ticked the box in
 * Settings → toowl, and never under a tool a license covers.
 */
function toowl_credit( $slug, $lang ) {
	if ( ! get_option( 'toowl_credit', false ) ) {
		return '';
	}
	if ( function_exists( 'toowl_license_covers' ) && toowl_license_covers( $slug ) ) {
		return '';
	}
	$url  = 'https://toowl.my.id/' . ( 'en' === $lang ? 'en/' : '' ) . rawurlencode( $slug ) . '/';
	$text = 'id' === $lang ? 'Dibuat dengan toowl' : 'Made with toowl';
	return '<p class="toowl-credit"><a href="' . esc_url( $url ) . '" target="_blank" rel="noopener">' . esc_html( $text ) . '</a></p>';
}

/**
 * A notice only people who can edit posts see; visitors get nothing.
 *
 * @param string $message Text (or HTML, when $escape is false).
 * @param bool   $escape  Escape $message.
 */
function toowl_editor_notice( $message, $escape = true ) {
	if ( ! current_user_can( 'edit_posts' ) ) {
		return '';
	}
	wp_enqueue_style( 'toowl' );
	return '<div class="toowl-notice">' . ( $escape ? esc_html( $message ) : wp_kses_post( $message ) ) . '</div>';
}
