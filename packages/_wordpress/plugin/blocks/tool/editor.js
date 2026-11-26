// Editor side of the toowl/tool block, plain JS (no build step). The tool
// itself only runs on the published page; in the editor the block is a card
// with the tool's name and its options in the sidebar.
( function ( wp ) {
	const { registerBlockType } = wp.blocks
	const { createElement: el, Fragment } = wp.element
	const { useBlockProps, InspectorControls } = wp.blockEditor
	const { PanelBody, SelectControl, Placeholder, Notice } = wp.components
	const { __, sprintf } = wp.i18n
	const data = window.toowlEditor || { tools: {}, edition: 'free', settingsUrl: '' }

	const toolOptions = [ { label: __( '— Choose a tool —', 'toowl' ), value: '' } ].concat(
		Object.keys( data.tools ).map( ( slug ) => ( {
			label: data.tools[ slug ].title + ( data.tools[ slug ].locked ? ' 🔒' : '' ),
			value: slug,
		} ) )
	)

	function Edit( { attributes, setAttributes } ) {
		const props = useBlockProps( { className: 'toowl-block' } )
		const tool = data.tools[ attributes.tool ]
		const pick = el( SelectControl, {
			label: __( 'Tool', 'toowl' ),
			value: attributes.tool,
			options: toolOptions,
			onChange: ( tool ) => setAttributes( { tool } ),
			__nextHasNoMarginBottom: true,
		} )

		const sidebar = el(
			InspectorControls,
			null,
			el(
				PanelBody,
				{ title: __( 'toowl', 'toowl' ) },
				pick,
				el( SelectControl, {
					label: __( 'Theme', 'toowl' ),
					value: attributes.theme,
					options: [
						{ label: __( 'Follow the visitor’s device', 'toowl' ), value: 'auto' },
						{ label: __( 'Light', 'toowl' ), value: 'light' },
						{ label: __( 'Dark', 'toowl' ), value: 'dark' },
					],
					onChange: ( theme ) => setAttributes( { theme } ),
					__nextHasNoMarginBottom: true,
				} ),
				el( SelectControl, {
					label: __( 'Language', 'toowl' ),
					value: attributes.lang,
					options: [
						{ label: __( 'Site language', 'toowl' ), value: '' },
						{ label: 'English', value: 'en' },
						{ label: 'Bahasa Indonesia', value: 'id' },
					],
					onChange: ( lang ) => setAttributes( { lang } ),
					__nextHasNoMarginBottom: true,
				} )
			)
		)

		if ( ! tool ) {
			return el( Fragment, null, sidebar, el( 'div', props, el( Placeholder, { icon: 'admin-tools', label: 'toowl' }, pick ) ) )
		}

		return el(
			Fragment,
			null,
			sidebar,
			el(
				'div',
				props,
				el(
					'div',
					{ className: 'toowl-block__card' },
					el( 'div', { className: 'toowl-block__mark', 'aria-hidden': true }, '◆' ),
					el(
						'div',
						null,
						el( 'strong', { className: 'toowl-block__title' }, tool.title ),
						el( 'p', { className: 'toowl-block__desc' }, tool.description ),
						el( 'p', { className: 'toowl-block__hint' }, __( 'The tool runs on the published page.', 'toowl' ) )
					)
				),
				tool.locked &&
					el(
						Notice,
						{ status: 'warning', isDismissible: false },
						sprintf( __( '%s needs a license that covers it; visitors won’t see it until then.', 'toowl' ), tool.title ),
						' ',
						el( 'a', { href: data.settingsUrl }, __( 'Enter a license key', 'toowl' ) )
					)
			)
		)
	}

	registerBlockType( 'toowl/tool', { edit: Edit, save: () => null } )
} )( window.wp )
