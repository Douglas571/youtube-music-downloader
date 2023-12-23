//TO-DO: Write all logic related to spotify
require('dotenv').config()
const SpotifyApi = require('spotify-web-api-node')
const axios = require('axios')
const lodash = require('lodash')

const fs = require('fs-extra')

const GLOBAL_CACHE = './cache.json'
let TOKEN = ''

const spotify_op = {
    client_id: process.env.SPOTIFY_ID,
    client_secret: process.env.SPOTIFY_KEY,
    redirect_URL: "http://localhost:4040/auth"
}

console.log({spotify_op})

function getAccessToken() {
    return fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `grant_type=client_credentials&client_id=${spotify_op.client_id}&client_secret=${spotify_op.client_secret}`
    }).then( res => res.json() )
    .then( json => {
        // console.log(json)
        TOKEN = json.access_token
    })
}

exports.find_album = (query) => {


}

exports.getPlaylist = async (playlistID) => {
    //const playlist = spt_wp.fetch_playlist(playlistID)

    if (!TOKEN) {
        await getAccessToken()
    }

    let res
    let json
    let songs

    try {
        res = await fetch(`https://api.spotify.com/v1/playlists/${playlistID}`, {
            method: 'GET',
            headers: {
                "Authorization": `Bearer ${TOKEN}`
            }
        })
        json = await res.json()

        fs.writeFile('spotify_raw_fetch.json', JSON.stringify(json, null, 2))


        if (!json) {
            return []
        }

        songs = json.tracks.items.map(({track}) => {
            // console.log({track})
            let new_song = lodash.pick(track, ['id', 'name', 'duration_ms'])
            new_song.artists = track.album.artists.map( art => art.name )
            new_song.album = { name: track.album.name, images: track.album.images}

            return new_song
        })

        return songs

    } catch(err) {
        console.log(err)

    }
}