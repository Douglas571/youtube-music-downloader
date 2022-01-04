require('dotenv').config({ path: '../.env'})

const SpotifyApi = require('spotify-web-api-node')
const {google} = require('googleapis')

const fs = require('fs')
const path = require('path')
const axios = require('axios')

// http://localhost:4040/auth?code=AQCU4GfqdiUmwCKvwpeL_DEaOyGkb9GgRcxU7Srr14jfKyoYTt5HOzh5qC3_pM1pkbwxKJnDrOooQ4kP6M6IjVRclDm0NcLDS9NO7VAgWyYsQNyL99VBG4_pvMM5ptmOQ_LVTUNWVLgeMyJb1-T-OcDIpS7Bifl8z3_IRfa0&state=1234567890

const redirectURL = "http://localhost:4040/auth"

const spotify_op = {
	client_id: process.env.SPOTIFY_ID,
  	client_secret: process.env.SPOTIFY_KEY,
  	redirectURL: redirectURL
}

console.log(spotify_op)

const spotify = new SpotifyApi({
	clientId: process.env.SPOTIFY_ID,
  	clientSecret: process.env.SPOTIFY_KEY,
  	redirectUri: redirectURL
})

const ytb = google.youtube({
  	version: 'v3',
    auth: process.env.GOOGLE_YT_KEY
})

async function get_album(search) {
	let album_id = ''
	const res = await spotify.searchAlbums(search)

	//console.log(JSON.stringify(res, null, 4))
	const album = res.body.albums.items[0]

	fs.writeFileSync(`album.json`, JSON.stringify(res, null, 4))

	return album
}

async function get_album_track_list(search) {
	const album = await get_album(search)
	const res = await spotify.getAlbumTracks(album.id)

	//console.log(JSON.stringify(res.body, null, 4))
	fs.writeFileSync(`tracks.json`, JSON.stringify(res, null, 4))	

	const album_track_list = []

	res.body.items.forEach( track => {
		let artists = track.artists.map( artist => artist.name )

		if (artists.length === 1) {
			artists = artists.join('')
		}

		const duration_sec = track.duration_ms / 1000
		album_track_list.push({
			title: track.name,
			trackNumber: track.track_number,
			artists,
			duration_sec
		})
	})

	let cover = album.images.filter( img => img.height >= 500 )[0].url
	let year = album.release_date.split('-')[0]


	return {
		name: album.name,
		artist: album.artists[0].name,
		cover,
		year,
		totalTracks: album.total_tracks,
		tracks: album_track_list,
	}
}

function get_cached_access_token(global_cache) {
	let access_token 
	try {
		// tomar el access token en cache
		const cache = JSON.parse(fs.readFileSync(global_cache))
		access_token = cache.access_token

	} catch (err) {
		console.log(err)
		// crear archivo
		fs.writeFileSync(global_cache, JSON.stringify({ access_token: '' }, null, 4))
		access_token = ''
		
	}

	return access_token
}

function save_cache_access_token(access_token, global_cache) {
	fs.writeFileSync(global_cache, JSON.stringify({ access_token }, null, 4))
}

async function fetch_access_token() {
	const params = new URLSearchParams()
	params.append('grant_type', 'client_credentials')

	const { client_id, client_secret } = spotify_op

	const options = {
		headers: {			
			'Authorization': `Basic ${(new Buffer(client_id + ':' + client_secret).toString('base64'))}`,
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		json: true
	}
	console.log('finding token...')
	const res = await axios.post('https://accounts.spotify.com/api/token', params, options)
	//console.log(res)
	const { access_token } = res.data

	return access_token
}

const isOfficialAudio = ({ artists }) => {
	return (v) => {
		let { title, channelTitle } = v.snippet
		title = title.toLowerCase()
		channelTitle = channelTitle.toLowerCase()

		let isOfficialAudio = false

		if (channelTitle.includes(artists)) {
			if (title.includes('audio') || 
				title.includes('lyric') ||
				(!title.includes('video'))) {

				isOfficialAudio = true
			}
		}

		return isOfficialAudio
	}
}

const isUnofficialAudioClean = (({ artists }) => {
	return (v) => {
		let { title, channelTitle } = v.snippet
		title = title.toLowerCase()
		channelTitle = channelTitle.toLowerCase()

		if (!channelTitle.includes(artists)) {
			if (title.includes('audio') ||
				title.includes('clean')){
				return true
			}
		}

		return false
	}
})

const extracNeededData = v => {
	return {
		youtube_id: v.id.videoId,
		title: v.snippet.title,
		channel: v.snippet.channelTitle
	}
}

const filterVideos = (videos, track) => {
	let data = {}

	if (Array.isArray(track.artists)) {
		data.artists = track.artists[0]
	} else {
		data.artists = track.artists
	}

	let official = videos.filter(isOfficialAudio(data))
						.map(extracNeededData)
	let unofficial = videos.filter(isUnofficialAudioClean(data))
						.map(extracNeededData)

	return { official, unofficial }
}

const filterDataExp = async () => {
	for (let idx = 1; idx <= 16; idx++) {
		let videos = JSON.parse(fs.readFileSync(path.join('ys', `${idx}.json`))).items

		console.log(videos)
		const filteder_data = filterVideos(videos, { artists: 'onerepublic'})

		fs.writeFileSync(path.join('cl', `${idx}.json`), JSON.stringify(filteder_data, null, 4))

	}
}

//filterDataExp()

const main = async (appdata) => {
	const global_cache = 'global.json'//path.join(appdata, 'global.json')

	const search = 'artist:OneRepublic album:Human'
	console.log(`finding ${search}`)

	let access_token = get_cached_access_token(global_cache)
	if (access_token == '') {
		access_token = await fetch_access_token()
		save_cache_access_token(access_token, global_cache)
	}

	console.log(`the access_token is: ${access_token}`)
	spotify.setAccessToken(access_token)

	let album
	try {
		album = await get_album_track_list(search)

	} catch (err) {
		// lo más probable es que el access token esté vencido
		console.log(err)

		access_token = await fetch_access_token()
		save_cache_access_token(access_token, global_cache)
		spotify.setAccessToken(access_token)

		album = await get_album_track_list(search)
	}

	console.log(`the album track list is: ${JSON.stringify(album, null, 4)}`)
	fs.writeFileSync('album.json', JSON.stringify(album, null, 4))

	let pending_videos = []

	for (let t of album.tracks) {
		console.log('searching video...')
		console.log(t)

		let artists = t.artists
		if (Array.isArray(t.artists)) {
			artists = t.artists.join(' ')
		}

		const res = await ytb.search.list({
			part: 'id,snippet',
			q: `${t.title} ${artists} official audio`
		})

		//console.log(JSON.stringify(res.data, null, 4))
		fs.writeFileSync(path.join('ys', `${t.trackNumber}.json`), JSON.stringify(res.data, null, 4))

		t.src = filterVideos(res.data.items, t)
	}

	fs.writeFileSync(`chorizo.json`, JSON.stringify(album, null, 4))

	//const track = await spotify.getTrack('6KL88T4Ma4ABXqzgUoEwkd')
	//fs.writeFileSync(`track.json`, JSON.stringify(track, null, 4))

	// si el access token está vencido, entonces
			// buscar un nuevo access token
			// guardar el access token en cache

		// buscar el album
		// buscar el tracklist
}

async function onlySpf() {
	const global_cache = 'global.json'//path.join(appdata, 'global.json')

	const search = 'artist:OneRepublic album:Human'
	console.log(`finding ${search}`)

	let access_token = get_cached_access_token(global_cache)
	if (access_token == '') {
		access_token = await fetch_access_token()
		save_cache_access_token(access_token, global_cache)
	}

	console.log(`the access_token is: ${access_token}`)
	spotify.setAccessToken(access_token)

	let album
	try {
		album = await get_album_track_list(search)

	} catch (err) {
		// lo más probable es que el access token esté vencido
		console.log(err)

		access_token = await fetch_access_token()
		save_cache_access_token(access_token, global_cache)
		spotify.setAccessToken(access_token)

		album = await get_album_track_list(search)
	}

	console.log(`the album track list is: ${JSON.stringify(album, null, 4)}`)
	fs.writeFileSync('album.json', JSON.stringify(album, null, 4))
}

onlySpf()