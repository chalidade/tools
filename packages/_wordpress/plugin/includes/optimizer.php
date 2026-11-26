<?php
/**
 * Image optimizer: images are scaled down, re-encoded and stripped of their
 * metadata in the browser before they are uploaded (admin/optimizer.js), plus
 * a "Compress with toowl" button on the Image block (admin/image-button.js).
 * The server only ever receives the smaller file.
 *
 * @package toowl
 */

defined( 'ABSPATH' ) || exit;

const TOOWL_OPTIMIZER_OPTION = 'toowl_optimizer';

/**
 * Saved settings with defaults.
 *
 * @return array{enabled: bool, max: int, quality: int, webp: bool}
 */
function toowl_optimizer_settings() {
	$saved = get_option( TOOWL_OPTIMIZER_OPTION, array() );
	$saved = is_array( $saved ) ? $saved : array();
	return array(
		'enabled' => (bool) ( $saved['enabled'] ?? true ),
		'max'     => (int) ( $saved['max'] ?? 1920 ),
		'quality' => (int) ( $saved['quality'] ?? 82 ),
		'webp'    => (bool) ( $saved['webp'] ?? false ),
	);
}

/** Can this server make the smaller sizes of a WebP upload? Otherwise WebP output stays off. */
function toowl_optimizer_webp_ok() {
	return function_exists( 'wp_image_editor_supports' ) && wp_image_editor_supports( array( 'mime_type' => 'image/webp' ) );
}

/** Sanitizes the settings form. */
function toowl_optimizer_sanitize( $input ) {
	$input = is_array( $input ) ? $input : array();
	return array(
		'enabled' => ! empty( $input['enabled'] ),
		'max'     => max( 0, min( 8000, absint( $input['max'] ?? 1920 ) ) ),
		'quality' => max( 40, min( 95, absint( $input['quality'] ?? 82 ) ) ),
		'webp'    => ! empty( $input['webp'] ),
	);
}

add_action(
	'admin_init',
	function () {
		register_setting(
			'toowl',
			TOOWL_OPTIMIZER_OPTION,
			array(
				'type'              => 'object',
				'sanitize_callback' => 'toowl_optimizer_sanitize',
			)
		);
	}
);

/** Registers the optimizer script with its settings (once). */
function toowl_optimizer_register_script() {
	if ( wp_script_is( 'toowl-optimizer', 'registered' ) ) {
		return;
	}
	$settings = toowl_optimizer_settings();
	// wp-plupload first, so the Media Library's uploader can be extended before it starts.
	wp_register_script( 'toowl-optimizer', plugins_url( 'admin/optimizer.js', TOOWL_FILE ), array( 'wp-plupload', 'wp-api-fetch', 'wp-i18n' ), TOOWL_VERSION, true );
	wp_set_script_translations( 'toowl-optimizer', 'toowl' );
	wp_add_inline_script(
		'toowl-optimizer',
		'window.toowlOptimizer = ' . wp_json_encode(
			array(
				'module'   => plugins_url( 'assets/dist/optimizer.js', TOOWL_FILE ) . '?ver=' . rawurlencode( TOOWL_VERSION ),
				'settings' => array(
					'enabled' => $settings['enabled'],
					'maxSide' => $settings['max'],
					'quality' => $settings['quality'],
					'webp'    => $settings['webp'] && toowl_optimizer_webp_ok(),
				),
			)
		) . ';',
		'before'
	);
}

/** Every screen that can upload (Media Library, media modal, block and classic editor). */
function toowl_optimizer_enqueue() {
	if ( ! current_user_can( 'upload_files' ) ) {
		return;
	}
	toowl_optimizer_register_script();
	wp_enqueue_script( 'toowl-optimizer' );
}
add_action( 'wp_enqueue_media', 'toowl_optimizer_enqueue' );

add_action(
	'enqueue_block_editor_assets',
	function () {
		toowl_optimizer_enqueue();
		if ( ! current_user_can( 'upload_files' ) ) {
			return;
		}
		wp_enqueue_script(
			'toowl-image-button',
			plugins_url( 'admin/image-button.js', TOOWL_FILE ),
			array( 'toowl-optimizer', 'wp-hooks', 'wp-compose', 'wp-element', 'wp-block-editor', 'wp-components', 'wp-i18n', 'wp-api-fetch', 'wp-data' ),
			TOOWL_VERSION,
			true
		);
		wp_set_script_translations( 'toowl-image-button', 'toowl' );
	}
);

/** The settings rows, inside the form on Settings → toowl. */
function toowl_optimizer_fields() {
	$s       = toowl_optimizer_settings();
	$name    = TOOWL_OPTIMIZER_OPTION;
	$webp_ok = toowl_optimizer_webp_ok();
	?>
	<h2><?php esc_html_e( 'Image optimizer', 'toowl' ); ?></h2>
	<p><?php esc_html_e( 'Images you upload are made smaller in your browser before they are sent, so big phone photos never reach your server and their location data is removed. Images already in posts can be compressed with the "Compress with toowl" button in the Image block toolbar.', 'toowl' ); ?></p>
	<table class="form-table" role="presentation">
		<tr>
			<th scope="row"><?php esc_html_e( 'Optimize uploads', 'toowl' ); ?></th>
			<td><label><input type="checkbox" name="<?php echo esc_attr( $name ); ?>[enabled]" value="1" <?php checked( $s['enabled'] ); ?>> <?php esc_html_e( 'Compress JPEG, PNG, WebP and HEIC images when they are uploaded', 'toowl' ); ?></label></td>
		</tr>
		<tr>
			<th scope="row"><label for="toowl-max"><?php esc_html_e( 'Largest side', 'toowl' ); ?></label></th>
			<td><input id="toowl-max" type="number" min="0" max="8000" step="1" class="small-text" name="<?php echo esc_attr( $name ); ?>[max]" value="<?php echo esc_attr( $s['max'] ); ?>"> px
				<p class="description"><?php esc_html_e( 'Bigger images are scaled down to this. 0 keeps the size.', 'toowl' ); ?></p></td>
		</tr>
		<tr>
			<th scope="row"><label for="toowl-quality"><?php esc_html_e( 'Quality', 'toowl' ); ?></label></th>
			<td><input id="toowl-quality" type="number" min="40" max="95" step="1" class="small-text" name="<?php echo esc_attr( $name ); ?>[quality]" value="<?php echo esc_attr( $s['quality'] ); ?>">
				<p class="description"><?php esc_html_e( '40–95 for JPEG and WebP. 82 looks the same as the original on screen.', 'toowl' ); ?></p></td>
		</tr>
		<tr>
			<th scope="row"><?php esc_html_e( 'WebP', 'toowl' ); ?></th>
			<td><label><input type="checkbox" name="<?php echo esc_attr( $name ); ?>[webp]" value="1" <?php checked( $s['webp'] ); ?> <?php disabled( ! $webp_ok ); ?>> <?php esc_html_e( 'Save JPEG and PNG uploads as WebP (usually 25–35% smaller)', 'toowl' ); ?></label>
				<?php if ( ! $webp_ok ) : ?>
					<p class="description"><?php esc_html_e( 'Your server\'s image library can\'t process WebP, so this stays off.', 'toowl' ); ?></p>
				<?php endif; ?></td>
		</tr>
	</table>
	<?php
}
