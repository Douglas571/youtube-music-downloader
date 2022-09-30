/*
	This script generate an instruction file for the ymd.
	
	(29-09-22) the program 


*/

// Config
	
	// https://open.spotify.com/playlist/7qV5puLDcA8EiPOMgwyVhH
	// beginnings
	// Girl in Red
	
	const album_query = {
		artist: "Girl in Red",
		name: "beginnings"
	}

	const type = "playlist"

	const resultFileName = 'gir-b-playlist.json'
	
// ------------------------

require('dotenv').config({ path: '../.env'})

const fs = require('fs-extra')
const _ = require('lodash')

const path = require('path')

const spt_wp = require('./spf-wrapper')
const yt_wp = require('./yt-wrapper')

function merge_tracks_with_videos(tracks, videos) {
	console.log(`the videos are: ${JSON.stringify(videos, null, 4)}`)
	let tracks_copy = _.cloneDeep(tracks)

	tracks_copy = tracks_copy.map( t => {
		const { id } = t

		console.log(`the id is: ${id}`)
		if (_.isEmpty(videos[id])) {
			console.log(videos[id])
			return t
		}

		t.preferred_video = videos[id].preferred_video
		t.videos = videos[id].videos

		return t
	})

	return tracks_copy
}

function log(name, obj) {
	fs.writeFileSync(
		path.join('proto', `${name}.json`), 
		JSON.stringify(obj, null, 4)
	)
}

function debug(msg, obj) {
	console.log(`DEBUG: ${msg}`)

	if (!_.isEmpty(obj)) {
		console.log(`\t${JSON.stringify(obj, null, 4)}`)
	}

}

/**
 * Main function that return the full album 
 * metadata and posibles video to audio
 * @param object: The query to fetch
 */
async function get_album(album_query) {
	let album = {}

	debug('fetching album data')
	album = await spt_wp.fetch_album_meta(album_query)
	log('album', album)

	debug('fetching videos from album: ', album)
	let videos = await yt_wp.fetch_videos(album.tracks)
	log('videos', videos)

	debug('mergin video:', videos)
	album.tracks = merge_tracks_with_videos(album.tracks, videos)
	log('merge', album)

	/*
	
	album.tracks = set_preferred_video(album.tracks)
	*/

	return album

	/*
		Should return:
			{
				name
				artist

				tracks [
					{
						id
						track_number
						title
						artist
						duration_sec
						preferred_video: contain and id
						videos [ sorted by duration_sec
							{
								id
								title
								channel
								duration_sec
							}
						]
					}
				]
			}
	*/	
}

async function get_playlist(query) {
	console.log('searching playlists: ', query)
	
	const results = await spt_wp.search_playlist(query)

	if (!results.items) return {}

	const playlist_id = results.items[0].id
	const playlist = await spt_wp.fetch_playlist(playlist_id)

	let videos = await yt_wp.fetch_videos(playlist.items)

	/* for testing when have the caché
	let playlist = JSON.parse(fs.readFileSync('proto/clean-playlist.json', 'utf-8'))
	let videos = JSON.parse(fs.readFileSync('proto/ready-videos.json', 'utf-8'))
	*/

	// TO-DO: merge videos
	playlist.items = merge_tracks_with_videos(playlist.items, videos)
	log('merge', playlist)


	return playlist
}

async function main() {

	console.log('Iniciando...')

	// Ensure the folder to save spotify access token
	fs.ensureFileSync('proto/global.json' )

	let instructionFile = {}

	switch(type) {
		case 'playlist': 
			let query = `${album_query.name} ${album_query.artist}`
			instructionFile = await get_playlist(query)
			break

		case 'album':
			console.log('searching album: ', album_query)
			instructionFile = await get_album(album_query)
			break

		default:
			console.log('Error: unknow type')
			return
			break

	}

	console.log({instructionFile})

	console.log(`the album is: ${JSON.stringify(instructionFile, null, 4)}`)
	
	fs.writeFileSync('proto/' + resultFileName , 
		JSON.stringify(instructionFile, null, 4))
}

module.exports = get_album
if (require.main === module) {
	console.log('executing from cmd')
	main()
}