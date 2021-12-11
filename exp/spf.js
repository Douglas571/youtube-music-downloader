require('dotenv').config()

const SpotifyApi = require('spotify-web-api-node')
const spotify_op = {
	clientId: process.env.SPOTIFY_ID,
  	clientSecret: process.env.SPOTIFY_KEY,
}

console.log(`${JSON.stringify(spotify_op, null, 4)}`)

const spotify = new SpotifyApi({
	clientId: process.env.SPOTIFY_ID,
  	clientSecret: process.env.SPOTIFY_KEY,
})

async function get_album_id(search) {
	const album_id = ''
	return album_id
}

async function get_album_track_list(search) {
	const album_id = get_album_id(search)
	const album_track_list = []

	return album_track_list
}

const main = async () => {
	const search = 'OneRepublic Human 2021'
	const album_track_list = await get_album_track_list(search)
	console.log(`the album track list is: ${JSON.stringify(album_track_list, null, 4)}`)
}