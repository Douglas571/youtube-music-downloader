const yargs = require('yargs/yargs')

const spotify = require('./spotify')
const youtube = require('./ytdl')
const util = require('./util')

const fs = require('fs-extra')


async function getPlaylist(playlistID) {
    console.log('fetching spotify...')
    // const playlist = await spotify.getPlaylist('0xgtaYxb701e6AXZHrOAya')
    let playlist = await fs.readFile('spotify_fetch.json')
    playlist = JSON.parse(playlist)
    
    console.log('the playlist is: ')
    console.log({playlist})

    //fs.writeFile('spotify_fetch.json', JSON.stringify(playlist, null, 2))
    
    return playlist
}

async function getVideos(playlist) {
    console.log('searching videos...')

    while (playlist.some( song => !song.videos )) {
        console.log('searching for videos...')

        let search = []
        let i = 0

        console.log({playlist})
        
        playlist.forEach( song => {
            if ((i < 3) && (!song.videos)) {
                search.push(song)
                i++
            }
        })

        console.log(search)

        search = search.map( song => {
            // console.log(JSON.stringify(song, null, 2))

            return youtube.searchVideos(song)
        })

        search = await Promise.allSettled(search)
        console.log('all promises settle down')

        search = search.map( result => {
            if(result.status = 'fulfilled') {
                const {value} = result
                
                fs.writeFile(`${value.id}.json`, JSON.stringify(value, null, 2))

                return value
            }

            return {}
        })

        console.log({search})

        fs.writeFile('playlistWithVideos.json', JSON.stringify(search, null, 2))
    }

}

async function convertVideo(videos) {
    console.log('converting videos...')

}

async function addMetadata(videos) {
    console.log('adding metadata...')
}

async function main() {
    
    console.log('init')


    playlistID = '0xgtaYxb701e6AXZHrOAya'

    const playlist = await getPlaylist()
    const videos = await getVideos(playlist)
    
    for (video in videos) {
        convertVideo(video)
        addMetadata(video)
    }
}

main()