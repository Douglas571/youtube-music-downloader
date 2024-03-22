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
    console.log({playlist})

    let newPlaylist = []

    // while (playlist.some( song => !song.videos )) {
    //     console.log('enter the loop searching for videos...')

    //     let search = []
    //     let i = 0
        
    //     playlist.forEach( song => {
    //         if ((i < 3) && (!song.videos)) {
    //             search.push(song)
    //             i++
    //         }
    //     })

    //     console.log(search)

    //     search = search.map( song => youtube.searchVideos(song) )

    //     search = await Promise.allSettled(search)
    //     console.log('all promises settle down')

    //     search = search.map( result => {
    //         if(result.status = 'fulfilled') {
    //             const {value} = result
    //             console.log('promise value is:')
    //             console.log({value})
                
    //             fs.writeFile(`${value.id}.json`, JSON.stringify(value, null, 2))

    //             return value
    //         }

    //         return {}
    //     })

    //     console.log({search})

    //     search.forEach( song => {
    //         // if the song has videos, add those videos to the playlist object
    //         if (song.videos) {
    //             let index = playlist.map( song => song.id ).indexOf(song.id)
    //             // find the song index on playlist
    //             // add videos to the song
    //             playlist[index].videos = song.videos
    //         }
    //     })

    //     fs.writeFile('lastSearchWithVideos.json', JSON.stringify(search, null, 2))
    //     fs.writeFile('playlistWithVideos.json', JSON.stringify(playlist, null, 2))
    // }

    // to request purpose
    let cachedPlaylistWithVideos = await fs.readFile('playlistWithVideos.json')

    playlist = JSON.parse(cachedPlaylistWithVideos)

    playlist = playlist.map( song => {
        let videos = song.videos.filter(v => v.id.kind === "youtube#video")
        return { ...song, videos }
    })
    
    // 2th part: searching all videos details
    let videosIDs = []

    playlist.forEach( song => {
        song.videos.forEach( video => {
            videosIDs.push(video.id.videoId)
        })
    })

    console.log({videosIDs})

    let allVideoDetails = await youtube.getVideosDetails(videosIDs)
    console.log({allVideoDetails})

    playlist = util.pairVideosWithSong(allVideoDetails, playlist)

    //console.log(JSON.stringify(playlist, null, 2))

    return playlist
}

async function downloadVideo(video) {
    console.log('downloading video...')
    await fs.ensureDir('videos')
    youtube.downloadVideo(video.id)
}

async function downloadAllVideos(playlist) {
    const IDs = playlist.map( s => {
        return { id: s.preferred_video.id, downloaded: false }
    } )
    

}

async function convertVideo(video) {
    console.log('converting videos...')

}

async function addMetadata(video) {
    console.log('adding metadata...')
}

async function main() {
    
    console.log('init')


    playlistID = '0xgtaYxb701e6AXZHrOAya'

    let playlist = await getPlaylist()
    playlist = await getVideos(playlist)

    console.log({playlist})
    
    while(playlist.some( song => !song.videoPath)) {
        console.log('looking for videos...')

        let downloads = []
        let i = 0

        playlist.forEach( song => {
            if ((i < 2) && (!song.videoPath)) {
                downloads.push(song)
                i++
            }
        })

        downloads = downloads.map( s => youtube.downloadVideo(s.preferred_video.id))
        downloads = await Promise.allSettled(downloads)

        let videosPaths = downloads.map( result => {
            if(result.status = 'fulfilled') {
                const {value} = result
                console.log('promise value is:')
                console.log({value})

                return value
            }

            return {}
        })

        videosPaths.forEach( v => {
            if (v.path) {
                let index = playlist.map(song => song.preferred_video.id).indexOf(v.id)
                playlist[index].videoPath = v.path
            }
        })

        console.log({playlistWithVideos: playlist})
        await fs.writeJSON('cacheDownloadedVideos.json', playlist)
        
    }


    
    
    // for (song of playlist) {

    //     console.log({song})

    //     // TODO: preferred_video returns undefined
    //     await downloadVideo(song.preferred_video)
    //     // convertVideo(video)
    //     // addMetadata(video)
    // }
}

main()