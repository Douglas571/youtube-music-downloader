 // sketch

/*
	descargar un album
		ymd -a ""
	descargar las mejores canciones
	descargar una playlist

	descargar y formatear canciones listadas

*/

const Cache = require('./cache')
const Spotify = require('./spotify')
const ytdl = require('./ytdl')

const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')

function main(op) {
	let cache = new Cache(op)

	if (op.a) {
		download_album(op, cache)
	}

	/*
		commentary long...
	
	switch(op.type){
		case '-a':
			download_album(op, cache)
			break

		case '-s':
			download_single()
			break
		
		case '-p':
			download_playlist()
			break

		case '-t':
			download_top_tracks()

		default:
			throw new Error(`Invalid operation`)
			break
	}
	*/
}

if (module === require.main) {
	const argv = parse_args(process.argv)
	console.log(argv)
	main(argv)
		.then( _ => process.exit(1))	
}

function parse_args(argv) {
	return yargs(hideBin(argv))
		.command('album [name]', 'download and album', (yargs) => {
			return yargs.positional({
				describe: 'the album name',
				default: ''
			})
		})
		.alias('a', 'album')
		.option('art', {
			describe: 'artists',
			alias: 'artist',
		})
		.option('st', {
			default: 5,
			alias: 'steps'
		})
		.parse()

	// delete later...
	return {
		type: '-a',
		album: 'manic',
		artist: 'halsey',

		how_many_songs: '5'
	}
}

function download_album(op, cache) {
	console.log('downloading album')
	return new Promise((resolve, reject) => {
		let state = {
			album: {},
			op,
			cache
		}

		find_album_metadata(state)
		.then( res => find_song_videos(res))
		.then( res => download_songs(res))
		.then( res => download_cover(res))
		.then( res => write_meta_data(res))
		.then(resolve)
		.catch(reject)
	})
}

function find_album_metadata(state) {
	return new Promise((resolve, reject) => {
		let { title, artist } = state.op
		let query = { title, artist }

		Spotify.find_album(query)
			.then( album => resolve({ ...state, album }))
			.catch(reject)
	})
}

function download_songs(state) {
	return new Promise((resolve, reject) => {
		let {album} = state
		let {how_many_songs: steps} = state.op
		let ids = album.tracks.map( t => t.id)

		ytdl.download_videos(ids, steps)
			.then( res => resolve({ ...state }))
			.catch( reject )
	})
}