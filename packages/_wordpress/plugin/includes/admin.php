<?php
/**
 * Settings → toowl: the tools in this build with their shortcodes, the
 * opt-in credit line, and (Pro) the license key.
 *
 * @package toowl
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'admin_menu',
	function () {
		add_options_page( 'toowl', 'toowl', 'manage_options', 'toowl', 'toowl_settings_page' );
	}
);

add_action(
	'admin_init',
	function () {
		register_setting(
			'toowl',
			'toowl_credit',
			array(
				'type'              => 'boolean',
				'default'           => false,
				'sanitize_callback' => 'rest_sanitize_boolean',
			)
		);
	}
);

add_filter(
	'plugin_action_links_' . plugin_basename( TOOWL_FILE ),
	function ( $links ) {
		array_unshift( $links, '<a href="' . esc_url( admin_url( 'options-general.php?page=toowl' ) ) . '">' . esc_html__( 'Settings', 'toowl' ) . '</a>' );
		return $links;
	}
);

// Pro: save or remove the license key.
add_action(
	'admin_post_toowl_license',
	function () {
		if ( ! current_user_can( 'manage_options' ) || ! function_exists( 'toowl_license_activate' ) ) {
			wp_die( esc_html__( 'You are not allowed to do that.', 'toowl' ) );
		}
		check_admin_referer( 'toowl_license' );
		$notice = 'saved';
		if ( isset( $_POST['remove'] ) ) {
			toowl_license_remove();
			$notice = 'removed';
		} else {
			$key    = sanitize_text_field( wp_unslash( $_POST['key'] ?? '' ) );
			$result = toowl_license_activate( $key );
			if ( is_wp_error( $result ) ) {
				set_transient( 'toowl_license_error', $result->get_error_message(), 60 );
				$notice = 'offline';
			}
		}
		wp_safe_redirect( admin_url( 'options-general.php?page=toowl&license=' . $notice ) );
		exit;
	}
);

function toowl_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$tools = toowl_tools();
	$pro   = function_exists( 'toowl_license' );
	?>
	<div class="wrap">
		<h1>toowl</h1>
		<p><?php esc_html_e( 'Browser-only tools as blocks and shortcodes. Files your visitors open in a tool never leave their device.', 'toowl' ); ?></p>

		<?php if ( $pro ) : ?>
			<?php toowl_license_section(); ?>
		<?php endif; ?>

		<h2><?php esc_html_e( 'Tools', 'toowl' ); ?></h2>
		<p><?php esc_html_e( 'Add a tool with its block (search "toowl" in the block inserter) or paste its shortcode anywhere shortcodes work.', 'toowl' ); ?></p>
		<table class="widefat striped" style="max-width:960px">
			<thead><tr>
				<th><?php esc_html_e( 'Tool', 'toowl' ); ?></th>
				<th><?php esc_html_e( 'Shortcode', 'toowl' ); ?></th>
				<th><?php esc_html_e( 'Status', 'toowl' ); ?></th>
			</tr></thead>
			<tbody>
			<?php foreach ( $tools as $slug => $tool ) : ?>
				<tr>
					<td><strong><?php echo esc_html( toowl_text( $tool, 'title' ) ); ?></strong><br><span class="description"><?php echo esc_html( toowl_text( $tool, 'description' ) ); ?></span></td>
					<td><code>[toowl tool="<?php echo esc_html( $slug ); ?>"]</code></td>
					<td>
						<?php
						if ( ! empty( $tool['free'] ) ) {
							esc_html_e( 'Free', 'toowl' );
						} elseif ( toowl_tool_unlocked( $slug ) ) {
							echo '<span style="color:#008a20">' . esc_html__( 'Licensed', 'toowl' ) . '</span>';
						} else {
							echo '<span style="color:#b32d2e">' . esc_html__( 'Needs a license', 'toowl' ) . '</span>';
						}
						?>
					</td>
				</tr>
			<?php endforeach; ?>
			</tbody>
		</table>
		<p class="description"><?php esc_html_e( 'Shortcode options: theme="auto|light|dark", lang="en|id" (default: the site language).', 'toowl' ); ?></p>

		<?php if ( ! $pro ) : ?>
			<p>
				<?php esc_html_e( 'More tools (PDF, Office, image, video, audio and more) come with toowl Pro.', 'toowl' ); ?>
				<a href="https://toowl.my.id/embed/" target="_blank" rel="noopener"><?php esc_html_e( 'See toowl Pro', 'toowl' ); ?></a>
			</p>
		<?php endif; ?>

		<h2><?php esc_html_e( 'Credit', 'toowl' ); ?></h2>
		<form method="post" action="options.php">
			<?php settings_fields( 'toowl' ); ?>
			<label>
				<input type="checkbox" name="toowl_credit" value="1" <?php checked( get_option( 'toowl_credit', false ) ); ?>>
				<?php esc_html_e( 'Show a small "Made with toowl" link under tools that no license covers.', 'toowl' ); ?>
			</label>
			<?php submit_button(); ?>
		</form>
	</div>
	<?php
}

/** Pro: the license form and what the saved key opens. */
function toowl_license_section() {
	$license = toowl_license();
	$product = toowl_license_product();
	$notice  = sanitize_key( $_GET['license'] ?? '' ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- display only.
	$error   = get_transient( 'toowl_license_error' );
	$en      = 'en' === toowl_lang();
	?>
	<h2><?php esc_html_e( 'License', 'toowl' ); ?></h2>
	<?php if ( 'offline' === $notice && $error ) : ?>
		<div class="notice notice-error"><p><?php echo esc_html( $error ); ?></p></div>
	<?php elseif ( 'saved' === $notice && ! empty( $license['valid'] ) ) : ?>
		<div class="notice notice-success"><p><?php esc_html_e( 'License saved.', 'toowl' ); ?></p></div>
	<?php elseif ( 'saved' === $notice && ! empty( $license['reason'] ) ) : ?>
		<div class="notice notice-error"><p><?php echo esc_html( $license['reason'] ); ?></p></div>
	<?php endif; ?>

	<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
		<input type="hidden" name="action" value="toowl_license">
		<?php wp_nonce_field( 'toowl_license' ); ?>
		<p>
			<input type="text" class="regular-text code" name="key" placeholder="XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX" value="<?php echo esc_attr( $license['key'] ?? '' ); ?>" autocomplete="off" spellcheck="false">
			<?php submit_button( __( 'Save key', 'toowl' ), 'primary', 'save', false ); ?>
			<?php if ( ! empty( $license['key'] ) ) : ?>
				<?php submit_button( __( 'Remove', 'toowl' ), 'secondary', 'remove', false ); ?>
			<?php endif; ?>
		</p>
	</form>
	<p>
		<?php
		if ( $product ) {
			$name = $en ? $product['name']['en'] : $product['name']['id'];
			if ( 'one' === $product['scope'] ) {
				$tools = toowl_tools();
				$tool  = $tools[ $license['tool'] ] ?? null;
				$name .= ': ' . ( $tool ? toowl_text( $tool, 'title' ) : $license['tool'] );
			}
			/* translators: %s: the product the key belongs to. */
			echo esc_html( sprintf( __( 'Active: %s.', 'toowl' ), $name ) );
		} elseif ( ! empty( $license['key'] ) && ! empty( $license['reason'] ) ) {
			echo esc_html( $license['reason'] );
		} else {
			esc_html_e( 'No license yet: only the free tools show on your site.', 'toowl' );
		}
		?>
	</p>
	<p class="description">
		<?php esc_html_e( 'Buy a license:', 'toowl' ); ?>
		<?php
		$links = array();
		foreach ( toowl_products() as $p ) {
			$links[] = '<a href="' . esc_url( $p['url'] ) . '" target="_blank" rel="noopener">' . esc_html( ( $en ? $p['name']['en'] : $p['name']['id'] ) . ' (' . $p['price'] . ')' ) . '</a>';
		}
		echo wp_kses_post( implode( ' · ', $links ) );
		?>
	</p>
	<?php
}
