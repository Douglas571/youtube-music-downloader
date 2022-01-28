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

module.exports = get_album
if (require.main === module) {
	console.log('executing from cms')
	main()
}

async function main() {
	let album_query = {
		artist: "",
		name: 'euphoria'
	}

	let album = await get_album(album_query)
	console.log(`the album is: ${JSON.stringify(album, null, 4)}`)
	fs.ensureDirSync('proto')
	fs.writeFileSync('proto/final-album.json', JSON.stringify(album, null, 4))
}