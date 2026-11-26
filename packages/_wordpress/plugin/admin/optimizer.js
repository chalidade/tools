// toowl image optimizer: images are made smaller in the browser before they
// are uploaded, so the original (and its GPS/EXIF data) never reaches the
// server. Plain JS, no build step; the engine (assets/dist/optimizer.js, the
// site's compress-image code) is imported only when an image comes along.
//
// Two ways into WordPress:
// - the block editor uploads through wp.apiFetch (POST /wp/v2/media): a middleware
//   swaps the file in the FormData;
// - the Media Library and the media modal upload through plupload (wp.Uploader):
//   a FilesAdded handler that runs before WordPress's own takes the images out,
//   optimizes them and adds the results back.
//
// Settings come from PHP as window.toowlOptimizer = { module, settings: { enabled, maxSide, quality, webp } }.
( function () {
	const cfg = window.toowlOptimizer
	if ( ! cfg || ! window.wp ) return
	const { __, sprintf } = wp.i18n

	let engine
	const load = () => ( engine = engine || import( cfg.module ) )
	/**
	 * Files that are already results (or were just made by us): never optimized twice.
	 * Kept by name, size, type and date, because FormData.get() hands back a new File object.
	 */
	const doneKeys = new Set()
	const key = ( file ) => [ file.name, file.size, file.type, file.lastModified ].join( '|' )
	const done = { add: ( file ) => doneKeys.add( key( file ) ), has: ( file ) => doneKeys.has( key( file ) ) }
	const TYPES = /^image\/(jpeg|png|webp|heic|heif)$/
	const looksOptimizable = ( file ) => file instanceof Blob && ( TYPES.test( file.type ) || /\.(heic|heif)$/i.test( file.name || '' ) )

	/** Optimizes one file; null when it isn't an image we take. Errors leave the original alone. */
	async function optimize( file ) {
		if ( done.has( file ) || ! looksOptimizable( file ) ) return null
		const e = await load()
		if ( ! e.canOptimize( file ) ) return null
		const result = await e.optimize( file, cfg.settings )
		done.add( result.file )
		return result
	}

	const size = ( bytes ) => ( bytes >= 1048576 ? ( bytes / 1048576 ).toFixed( 1 ) + ' MB' : Math.max( 1, Math.round( bytes / 1024 ) ) + ' KB' )

	/** A short message: a snackbar in the block editor, a small toast elsewhere. */
	function notice( message, status ) {
		const notices = window.wp.data && wp.data.dispatch( 'core/notices' )
		if ( notices && document.body.classList.contains( 'block-editor-page' ) ) {
			notices.createNotice( status || 'success', message, { type: 'snackbar', id: 'toowl-optimizer', isDismissible: true } )
			return
		}
		let toast = document.getElementById( 'toowl-toast' )
		if ( ! toast ) {
			toast = document.createElement( 'div' )
			toast.id = 'toowl-toast'
			toast.setAttribute( 'role', 'status' )
			toast.style.cssText = 'position:fixed;z-index:200000;left:50%;bottom:24px;transform:translateX(-50%);max-width:90vw;padding:10px 16px;border-radius:8px;background:#1e1e1e;color:#fff;font:13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.25)'
			document.body.append( toast )
		}
		toast.textContent = message
		toast.hidden = false
		clearTimeout( toast.timer )
		toast.timer = setTimeout( () => ( toast.hidden = true ), 6000 )
	}

	// Several images dropped at once give one message, not one per file.
	let batch = []
	let batchTimer
	function report( result ) {
		if ( ! result ) return
		batch.push( result )
		clearTimeout( batchTimer )
		batchTimer = setTimeout( () => {
			const before = batch.reduce( ( n, r ) => n + r.before, 0 )
			const after = batch.reduce( ( n, r ) => n + r.after, 0 )
			const saved = before > 0 ? Math.round( ( 1 - after / before ) * 100 ) : 0
			const message =
				saved > 0
					? sprintf(
							/* translators: 1: number of images, 2: size before, 3: size after, 4: percent saved. */
							__( 'toowl optimized %1$d image(s): %2$s → %3$s (−%4$d%%).', 'toowl' ),
							batch.length,
							size( before ),
							size( after ),
							saved
					  )
					: __( 'toowl: these images were already compact; only their metadata (GPS, camera) was removed.', 'toowl' )
			notice( message )
			batch = []
		}, 700 )
	}

	// For the "Compress with toowl" button (image-button.js) and other callers.
	cfg.optimize = optimize
	cfg.notice = notice
	cfg.size = size
	cfg.markDone = ( file ) => done.add( file )

	if ( ! cfg.settings.enabled ) return

	// Block editor (and anything else using wp.apiFetch to create media).
	if ( wp.apiFetch ) {
		wp.apiFetch.use( ( options, next ) => {
			const body = options.body
			const target = options.path || options.url || ''
			const isUpload = body instanceof FormData && String( options.method || '' ).toUpperCase() === 'POST' && /\/wp\/v2\/media\/?(\?|$)/.test( target )
			const file = isUpload ? body.get( 'file' ) : null
			if ( ! ( file instanceof File ) || done.has( file ) || ! looksOptimizable( file ) ) return next( options )
			return optimize( file ).then(
				( result ) => {
					if ( result ) {
						body.set( 'file', result.file, result.file.name )
						report( result )
					}
					return next( options )
				},
				( error ) => {
					console.warn( 'toowl optimizer: uploading the original', error ) // eslint-disable-line no-console
					return next( options )
				}
			)
		} )
	}

	// Media Library, media modal, classic editor's "Add Media".
	if ( wp.Uploader && wp.Uploader.prototype ) {
		const init = wp.Uploader.prototype.init
		wp.Uploader.prototype.init = function () {
			init.apply( this, arguments )
			const uploader = this.uploader
			if ( ! uploader ) return
			uploader.bind(
				'FilesAdded',
				( up, files ) => {
					const mine = files.filter( ( f ) => {
						const native = f.getNative && f.getNative()
						return native && ! done.has( native ) && looksOptimizable( native )
					} )
					if ( ! mine.length ) return
					// Read the browser files first: removeFile() destroys plupload's wrapper.
					const natives = mine.map( ( f ) => f.getNative() )
					// Out of this batch (WordPress's own handler, which runs next, uploads what is left)…
					for ( const f of mine ) {
						files.splice( files.indexOf( f ), 1 )
						up.removeFile( f )
					}
					notice( sprintf( /* translators: %d: number of images. */ __( 'toowl is optimizing %d image(s)…', 'toowl' ), mine.length ), 'info' )
					// …and back in once optimized; a failure uploads the original.
					Promise.all(
						natives.map( ( native ) =>
							optimize( native ).then(
								( result ) => {
									report( result )
									return result ? result.file : native
								},
								() => native
							)
						)
					).then( ( results ) => {
						for ( const file of results ) {
							done.add( file )
							up.addFile( file, file.name )
						}
					} )
				},
				null,
				100 // before WordPress's handler (priority 0), which starts the upload
			)
		}
	}
} )()
