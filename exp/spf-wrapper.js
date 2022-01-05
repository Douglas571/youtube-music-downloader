require('dotenv').config({ path: '../.env'})

const SpotifyApi = require('spotify-web-api-node')
const fs = require('fs-extra')
const _ = require('lodash')

const path = require('path')
const axios = require('axios')

exports.fetch_album_meta = async (query) => {
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

	clean_data = {
		type: 'album',
		name: album.name,
		artist: album.artists[0].name,
		cover,
		year,
		totalTracks: album.total_tracks,
		tracks: album_track_list,
	}

	return clean_data
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

const GLOBAL_CACHE = path.join('proto', 'global.json')

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

function save_cache_access_token(access_token, global_cache = GLOBAL_CACHE) {
	fs.writeFileSync(global_cache, JSON.stringify({ access_token }, null, 4))
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

function debug(msg, obj) {
	console.log(`DEBUG: ${msg}`)

	if (!_.isEmpty(obj)) {
		console.log(`\t${JSON.stringify(obj, null, 4)}`)
	}

}