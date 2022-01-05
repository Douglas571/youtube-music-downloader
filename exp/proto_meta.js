require('dotenv').config({ path: '../.env'})

const {google} = require('googleapis')
const fs = require('fs-extra')
const _ = require('lodash')

const path = require('path')

const spt_wp = require('./spf-wrapper')

const ytb = google.youtube({
  version: 'v3',
  auth: process.env.GOOGLE_YT_KEY,
  timeout: (5*1000)
})

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

function get_preferred_video(videos, duration) {
	duraton = Math.floor(duration)
	const video_copy = _.orderBy(_.cloneDeep(videos), ['duration_sec'], ['desc'])

	let tolerance = 0.5
	let founded = false

	const isNearOf = (duration, t) => {
		console.log(`t=${t}`)
		console.log(`duration=${duration}`)
		return (v) => {
			console.log(v)
			let diff = duration - v.duration_sec
			console.log(`diff=${diff} t=${t}`)
			console.log(`((diff >= 0) && (diff <= t))=${((diff >= 0) && (diff <= t))}`)
			console.log(`((diff < 0) && (diff >= t))=${((diff < 0) && (diff >= t))}`)

			if (((diff >= 0) && (diff <= t)) ||
				((diff < 0) && (diff >= -t))) {
				console.log('valid')
				return true
			}

			console.log('invalid')
			return false
		}
	}

	let video
	while(!founded) {
		video = video_copy.find(isNearOf(duration, tolerance))

		if(_.isEmpty(video)) {
			tolerance += 0.5
		} else {
			console.log(video)
			founded = true
		}
	}

	const diff = duration - video.duration_sec
	/*
		console.log(`
		title: ${video.title}
		preferred_duration: ${duration}
		duration: ${video.duration_sec}
		tolerance: ${tolerance}
		diff: ${diff} < ${tolerance} : ${(diff < tolerance)}
			  ${diff} > -${tolerance} : ${(diff > -tolerance)}`)
	*/

	/*
		Should return and id
	*/
	return video
}

function generate_youtube_query(track) {
	// optener datos y formar el query de youtube
	let artists = track.artists
	if (Array.isArray(track.artists)) {
		artists = track.artists.join(' ')
	}

	const query = `${track.title} ${artists} official audio`

	return query
}

async function fetch_ids(query) {
	// buscar los videos 
	console.log(`searching videos: ${query}...`)
	let res
	let ids
	try {
		res = await ytb.search.list({
			part: 'id,snippet',
			q: query
		})
	} catch(err) {
		console.log(err)

		if (err.errors) {
			if (err.errors.some(e => e.reason === "quotaExceeded")) {
				console.log('Cuota de peticiones excedida')
				return []
			}
		}

		console.log("retriying fetch_ids")
		ids = await fetch_ids(query)

		return ids
	}

	// optener un array con los id de los videos coincidentes
	console.log(`1: ${JSON.stringify(res.data.items[0], null, 4)}`)
	ids = res.data.items.map( v => v.id.videoId)

	return ids
}

function parse_duration(v) {
	// parsear la duración del video y trasformarla a Segundos
	const v_copy = _.cloneDeep(v)
	const duration = v_copy.contentDetails.duration

	const min = Number(duration.slice(
		duration.indexOf('PT') + 2, 
		duration.indexOf('M')))

	const sec = Number(duration.slice(
		duration.indexOf('M') + 1, 
		duration.indexOf('S')))

	console.log(`${min}min ${sec}sec`)

	const total = min * 60 + sec

	v_copy.duration_sec = total

	return v_copy
}

async function fetch_videos_details(ids) {
	// buscar los detalles de cada video
	console.log('getting details...')

	if (_.isEmpty(ids)) {
		return {}
	}

	let res
	let vds

	try {
		res = await ytb.videos.list({
			id: ids.join(','),
			part: "id, snippet, contentDetails"
		})
	} catch(err) {
		console.log(err)
		console.log("retriying fetch_ids")
		vds = await fetch_videos_details(ids)

		return vds
	}

	fs.writeFileSync('proto/d-videos.json', JSON.stringify(res.data, null, 4))
	vds = res.data.items
					.map(parse_duration)
					.map( v => {
						return {
							id: v.id,
							title: v.snippet.title,
							duration_sec: v.duration_sec
						}
					})

	return vds
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
	let videos = await fetch_videos(album.tracks)
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
		name: "justice",
		artist: 'justin bieber'
	}

	let album = await get_album(album_query)
	console.log(`the album is: ${JSON.stringify(album, null, 4)}`)
	fs.ensureDirSync('proto')
	fs.writeFileSync('proto/final-album.json', JSON.stringify(album, null, 4))
}