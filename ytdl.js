// TO-DO: Write all logic related to download videos from Youtube
require('dotenv').config()
const {google} = require('googleapis')

const fs = require('fs-extra')

const TOKEN = process.env.GOOGLE_YT_KEY

// const oauth2Client = new google.auth.OAuth2(
//     process.env.GOOGLE_YT_ID,
//     process.env.GOOGLE_YT_KEY,
//     'http://localhost:4040/auth'
// );

// async getAuthToken() {

// }

exports.searchVideos = async (song) => {
    
    // TODO: get the authentication credentials
    const query = song.name + song.artists.join(', ')
    const q = query.replace(' ', '%')

    const res = await fetch(`https://youtube.googleapis.com/youtube/v3/search?q=${q}&regionCode=US&key=${TOKEN}`, {
        method: 'GET',
        headers: {
            // Authorization: 'Bearer BQD5h5FSzuBgH4O-92nHS-rd0gVlmtwJr3ahbu70x1Y7Cheam-IFVpWjYT7XFM2Z-CsEuRhRIriRU8OcXAnqxejz-KGPdQWZsknDYQFuggSz-J_Rarc',
            Accept: 'application/json'
        }
    })

    const j = await res.json()

    fs.writeFile('fetch.json', JSON.stringify(j))

    const videos = j.items
    const songWithVideos = {...song, videos}
    return songWithVideos
}

exports.download_song = () => {

}

exports.download_videos = () => {

}