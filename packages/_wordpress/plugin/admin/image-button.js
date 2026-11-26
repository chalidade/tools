// "Compress with toowl" in the Image block's toolbar, for pictures already in
// the Media Library: the full-size file is fetched, optimized in the browser
// (admin/optimizer.js) and uploaded as a new attachment, which the block then
// shows. The old attachment stays in the library untouched.
( function ( wp ) {
	const cfg = window.toowlOptimizer
	if ( ! cfg || ! cfg.optimize ) return
	const { addFilter } = wp.hooks
	const { createHigherOrderComponent } = wp.compose
	const { createElement: el, Fragment, useState } = wp.element
	const { BlockControls } = wp.blockEditor
	const { ToolbarGroup, ToolbarButton, Spinner } = wp.components
	const { __, sprintf } = wp.i18n

	async function compress( attributes, setAttributes ) {
		const media = await wp.apiFetch( { path: '/wp/v2/media/' + attributes.id + '?context=edit' } )
		const source = media.source_url
		// WordPress serves big uploads as "name-scaled.jpg"; upload the copy under the plain name.
		const name = decodeURIComponent( source.split( '/' ).pop().split( '?' )[ 0 ] ).replace( /-scaled(?=\.[^.]+$)/, '' )
		const response = await fetch( source, { credentials: 'same-origin' } )
		if ( ! response.ok ) throw new Error( 'fetch ' + response.status )
		const blob = await response.blob()
		const result = await cfg.optimize( new File( [ blob ], name, { type: blob.type } ) )
		if ( ! result ) return cfg.notice( __( 'toowl: this image type can\'t be compressed (GIF and SVG are left as they are).', 'toowl' ), 'info' )
		if ( result.kept || result.after > result.before * 0.97 ) {
			return cfg.notice( __( 'toowl: this image is already compact.', 'toowl' ), 'info' )
		}
		const form = new FormData()
		form.append( 'file', result.file, result.file.name )
		if ( media.alt_text ) form.append( 'alt_text', media.alt_text )
		if ( media.caption && media.caption.raw ) form.append( 'caption', media.caption.raw )
		if ( media.post ) form.append( 'post', String( media.post ) )
		const created = await wp.apiFetch( { path: '/wp/v2/media', method: 'POST', body: form } )
		const sizes = ( created.media_details && created.media_details.sizes ) || {}
		const slug = attributes.sizeSlug
		setAttributes( { id: created.id, url: ( slug && sizes[ slug ] && sizes[ slug ].source_url ) || created.source_url } )
		cfg.notice(
			sprintf(
				/* translators: 1: size before, 2: size after, 3: percent saved. */
				__( 'toowl: %1$s → %2$s (−%3$d%%). The original stays in the Media Library.', 'toowl' ),
				cfg.size( result.before ),
				cfg.size( result.after ),
				Math.round( ( 1 - result.after / result.before ) * 100 )
			)
		)
	}

	function CompressButton( { attributes, setAttributes } ) {
		const [ busy, setBusy ] = useState( false )
		const onClick = () => {
			setBusy( true )
			compress( attributes, setAttributes )
				.catch( ( error ) => {
					console.warn( 'toowl', error ) // eslint-disable-line no-console
					cfg.notice( __( 'toowl couldn\'t compress this image. Images from other sites can\'t be read; upload them to the Media Library first.', 'toowl' ), 'error' )
				} )
				.finally( () => setBusy( false ) )
		}
		return el(
			BlockControls,
			{ group: 'other' },
			el(
				ToolbarGroup,
				null,
				el( ToolbarButton, { icon: busy ? el( Spinner ) : 'performance', label: __( 'Compress with toowl', 'toowl' ), onClick, disabled: busy } )
			)
		)
	}

	const withCompress = createHigherOrderComponent(
		( BlockEdit ) => ( props ) =>
			props.name === 'core/image' && props.attributes.id && props.isSelected
				? el( Fragment, null, el( BlockEdit, props ), el( CompressButton, props ) )
				: el( BlockEdit, props ),
		'withToowlCompress'
	)

	addFilter( 'editor.BlockEdit', 'toowl/compress-image', withCompress )
} )( window.wp )
