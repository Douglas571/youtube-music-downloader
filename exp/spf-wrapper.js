require('dotenv').config({ path: '../.env'})

const SpotifyApi = require('spotify-web-api-node')
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


async function fetch_album_meta(query) {
	let album = {}

	return album
}

module.exports = fetch_album_meta