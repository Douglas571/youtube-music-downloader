require('dotenv').config({ path: '../.env'})

const SpotifyApi = require('spotify-web-api-node')
const {google} = require('googleapis')
const fs = require('fs-extra')
const _ = require('lodash')

const path = require('path')
const axios = require('axios')


const spotify_op = {
	client_id: process.env.SPOTIFY_ID,
  client_secret: process.env.SPOTIFY_KEY,
  redirect_URL: "http://localhost:4040/auth"
}

const spotify = new SpotifyApi({
	clientId: spotify_op.client_id,
  clientSecret: spotify_op.client_secret,
  redirectUri: spotify_op.redirect_URL
})

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

		if (err.errors.some(e => e.reason === "quotaExceeded")) {
			console.log('Cuota de peticiones excedida')
			return []
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
	const duration = v.contentDetails.duration

	const min = Number(duration.slice(
		duration.indexOf('PT') + 2, 
		duration.indexOf('M')))

	const sec = Number(duration.slice(
		duration.indexOf('M') + 1, 
		duration.indexOf('S')))

	console.log(`${min}min ${sec}sec`)

	const total = min * 60 + sec

	return {
		id: v.id,
		title: v.snippet.title,
		duration_sec: total
	}
}

async function fetch_videos_details(ids) {
	// buscar los detalles de cada video
	console.log('getting details...')

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
	vds = res.data.items.map(parse_duration)

	return vds
}

async function fetch_videos(tracks) {
	let videos = {}

	for (let t of tracks) {
		/*
			// optener un track
			let t = _.cloneDeep(tracks[0])
		*/
		let query = generate_youtube_query(t)
		let ids = await fetch_ids(query)

		let videos_with_details = await fetch_videos_details(ids)
		let preferred_video = get_preferred_video(
														videos_with_details, 
														t.duration_sec
													)

		// asignar videos al id del track
		videos[t.id] = {
			preferred_video,
			videos: videos_with_details
		}
	}

	fs.writeFileSync('proto/ready-videos.json', JSON.stringify(videos, null, 4))

	return videos

	/*
		Should return a objet that pair tracks id with videos:
				track_id [
					{
						id
						title
						channel
						duration_sec
					}
				]
	*/
}

async function get_album_track_list(id) {
	const res = await spotify.getAlbumTracks(id)

	//console.log(JSON.stringify(res.body, null, 4))
	fs.writeFileSync(`proto/s-tracks.json`, JSON.stringify(res.body, null, 4))	

	const album_track_list = []

	// extract pertinent data for each track
	res.body.items.forEach( track => {
		let artists = track.artists.map( artist => artist.name )

		if (artists.length === 1) {
			artists = artists.join('')
		}

		const duration_sec = track.duration_ms / 1000
		album_track_list.push({
			id: track.id,
			title: track.name,
			track_number: track.track_number,
			artists,
			duration_sec
		})
	})

	return album_track_list

	/*
		Should return a list of tracks without videos [
			{
				id
				track_number
				title
				artists
				duration_sec
			}
		]
	*/
}
function save_cache_access_token(access_token, global_cache = GLOBAL_CACHE) {
	fs.writeFileSync(global_cache, JSON.stringify({ access_token }, null, 4))
}

async function fetch_access_token() {
	const { client_id, client_secret } = spotify_op
	const params = new URLSearchParams()
	const options = {
		headers: {			
			'Authorization': `Basic ${(new Buffer(client_id + ':' + client_secret).toString('base64'))}`,
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		json: true
	}

	params.append('grant_type', 'client_credentials')
	
	debug("finding token")
	const res = await axios.post('https://accounts.spotify.com/api/token', params, options)
	//console.log(res)
	const { access_token } = res.data

	return access_token
}

async function get_access_token(global_cache) {
	let access_token 
	try {
		// tomar el access token en cache
		const cache = JSON.parse(fs.readFileSync(global_cache))
		access_token = cache.access_token

	} catch (err) {
		//console.log(err)
		// crear archivo
		fs.writeFileSync(global_cache, JSON.stringify({ access_token: '' }, null, 4))
		access_token = ''
		
	}

	if (access_token == '') {
		access_token = await fetch_access_token()
		save_cache_access_token(access_token, global_cache)
	}

	return access_token
}

const GLOBAL_CACHE = path.join('proto', 'global.json')
async function fetch_album_meta(query) {
	// Get the access token
	const global_cache = GLOBAL_CACHE
	let access_token = await get_access_token(global_cache)

	console.log(`the access_token is: ${access_token}`)
	spotify.setAccessToken(access_token)

	let search = `artist:${query.artist} album:${query.name}`
	let res
	try {
		res = await spotify.searchAlbums(search)

	} catch(err) {
		access_token = await fetch_access_token()
		save_cache_access_token(access_token)
		spotify.setAccessToken(access_token)

		res = await spotify.searchAlbums(search)
	}

	const album = res.body.albums.items[0]

	fs.writeFileSync(`proto/s-album.json`, JSON.stringify(res.body, null, 4))
	const album_track_list = await get_album_track_list(album.id)

	let clean_album = {}

	let cover = album.images.filter( img => img.height >= 500 )[0].url
	let year = album.release_date.split('-')[0]

	clean_album = {
		name: album.name,
		artist: album.artists[0].name,
		cover,
		year,
		totalTracks: album.total_tracks,
		tracks: album_track_list,
	}

	return clean_album
	/*
		Should return the album meta:
			{
				name,
				artist,
				tracks [
					{
						id
						track_number
						title
						artist
						duration_sec
					}
				]
			}
	*/
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
	album = await fetch_album_meta(album_query)
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
		name: "if i can't have love i want power",
		artist: 'halsey'
	}

	let album = await get_album(album_query)
	console.log(`the album is: ${JSON.stringify(album, null, 4)}`)
	fs.ensureDirSync('proto')
	fs.writeFileSync('proto/final-album.json', JSON.stringify(album, null, 4))
}