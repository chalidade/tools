<?php
/**
 * Pro only: license keys bought on Gumroad. The key's product decides what it
 * opens — one tool (the "[slug]" checkout variant), a theme pack, or all tools
 * — read from assets/products.json, which build.mjs writes from the Gumroad
 * products in the site's src/lib/license.ts.
 *
 * The key is checked by this server against Gumroad's public verify endpoint
 * (no secret API key), once when it is saved and again weekly. Visitors' browsers
 * never contact Gumroad. If Gumroad can't be reached, the last answer stands.
 *
 * @package toowl
 */

defined( 'ABSPATH' ) || exit;

const TOOWL_LICENSE_OPTION = 'toowl_license';
const TOOWL_LICENSE_CRON   = 'toowl_license_recheck';

/**
 * Gumroad products whose keys count.
 *
 * @return array<int, array{id: string, url: string, price: string, name: array{id: string, en: string}, scope: string|string[]}>
 */
function toowl_products() {
	static $products = null;
	if ( null === $products ) {
		$json     = file_get_contents( TOOWL_DIR . '/assets/products.json' ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local file.
		$products = json_decode( (string) $json, true );
		if ( ! is_array( $products ) ) {
			$products = array();
		}
	}
	return $products;
}

/**
 * The saved license: key, valid, product (Gumroad product id), tool (single-tool variant), reason, checked (time).
 *
 * @return array
 */
function toowl_license() {
	$license = get_option( TOOWL_LICENSE_OPTION, array() );
	return is_array( $license ) ? $license : array();
}

/** The product the saved key belongs to, if it is valid. */
function toowl_license_product() {
	$license = toowl_license();
	if ( empty( $license['valid'] ) ) {
		return null;
	}
	foreach ( toowl_products() as $product ) {
		if ( $product['id'] === $license['product'] ) {
			return $product;
		}
	}
	return null;
}

/** Does the saved key open this tool? */
function toowl_license_covers( $slug ) {
	$product = toowl_license_product();
	if ( ! $product ) {
		return false;
	}
	if ( 'all' === $product['scope'] ) {
		return true;
	}
	if ( 'one' === $product['scope'] ) {
		return toowl_license()['tool'] === $slug;
	}
	return in_array( $slug, (array) $product['scope'], true );
}

/** Gumroad keys: four groups of eight hex digits. */
function toowl_license_format_ok( $key ) {
	return (bool) preg_match( '/^[0-9a-f]{8}(-[0-9a-f]{8}){3}$/i', $key );
}

/**
 * Asks Gumroad about the key, product by product (a key belongs to exactly one).
 *
 * @return array|WP_Error The license to save, or an error when Gumroad couldn't be reached.
 */
function toowl_license_check( $key ) {
	$key = trim( (string) $key );
	if ( ! toowl_license_format_ok( $key ) ) {
		return array(
			'key'    => $key,
			'valid'  => false,
			'reason' => __( 'That doesn\'t look like a toowl license key (XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX).', 'toowl' ),
		);
	}
	$reached = false;
	foreach ( toowl_products() as $product ) {
		$response = wp_remote_post(
			'https://api.gumroad.com/v2/licenses/verify',
			array(
				'timeout' => 15,
				'body'    => array(
					'product_id'           => $product['id'],
					'license_key'          => $key,
					'increment_uses_count' => 'false',
				),
			)
		);
		if ( is_wp_error( $response ) ) {
			continue;
		}
		$code = wp_remote_retrieve_response_code( $response );
		if ( $code >= 500 ) {
			continue;
		}
		$reached = true;
		$answer  = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( empty( $answer['success'] ) ) {
			continue; // Not this product's key.
		}
		$purchase = is_array( $answer['purchase'] ?? null ) ? $answer['purchase'] : array();
		$result   = array(
			'key'     => $key,
			'valid'   => true,
			'product' => $product['id'],
			'tool'    => preg_match( '/\[([a-z0-9-]+)\]/', (string) ( $purchase['variants'] ?? '' ), $m ) ? $m[1] : '',
			'checked' => time(),
		);
		if ( ! empty( $purchase['refunded'] ) || ! empty( $purchase['chargebacked'] ) || ! empty( $purchase['disputed'] ) ) {
			$result['valid']  = false;
			$result['reason'] = __( 'This purchase was refunded.', 'toowl' );
		} elseif ( ! empty( $purchase['subscription_ended_at'] ) || ! empty( $purchase['subscription_cancelled_at'] ) || ! empty( $purchase['subscription_failed_at'] ) ) {
			$result['valid']  = false;
			$result['reason'] = __( 'This subscription has ended.', 'toowl' );
		}
		return $result;
	}
	if ( ! $reached ) {
		return new WP_Error( 'toowl_offline', __( 'Couldn\'t reach Gumroad to check the key. Try again in a moment.', 'toowl' ) );
	}
	return array(
		'key'     => $key,
		'valid'   => false,
		'reason'  => __( 'Unknown license key.', 'toowl' ),
		'checked' => time(),
	);
}

/**
 * Checks and saves a key typed in Settings → toowl.
 *
 * @return array|WP_Error
 */
function toowl_license_activate( $key ) {
	$result = toowl_license_check( $key );
	if ( is_wp_error( $result ) ) {
		return $result;
	}
	update_option( TOOWL_LICENSE_OPTION, $result );
	if ( ! wp_next_scheduled( TOOWL_LICENSE_CRON ) ) {
		wp_schedule_event( time() + WEEK_IN_SECONDS, 'weekly', TOOWL_LICENSE_CRON );
	}
	return $result;
}

/** Forgets the key (e.g. to move it to another site). */
function toowl_license_remove() {
	delete_option( TOOWL_LICENSE_OPTION );
	toowl_license_unschedule();
}

function toowl_license_unschedule() {
	wp_clear_scheduled_hook( TOOWL_LICENSE_CRON );
}

// Weekly: a refunded or ended purchase stops working; an unreachable Gumroad changes nothing.
add_action(
	TOOWL_LICENSE_CRON,
	function () {
		$license = toowl_license();
		if ( empty( $license['key'] ) ) {
			toowl_license_unschedule();
			return;
		}
		$result = toowl_license_check( $license['key'] );
		if ( ! is_wp_error( $result ) ) {
			update_option( TOOWL_LICENSE_OPTION, $result );
		}
	}
);
