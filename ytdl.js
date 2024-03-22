// TO-DO: Write all logic related to download videos from Youtube
require('dotenv').config()
const {google} = require('googleapis')
const ytdl = require('ytdl-core');

const readline = require('readline');
const ffmpeg = require('fluent-ffmpeg');

const fs = require('fs-extra')

const TOKEN = process.env.GOOGLE_YT_KEY

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

function extractDurationAndConvertToMilliseconds(durationString) {
    const durationParts = durationString.match(/P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
   
    if (!durationParts) {
      throw new Error("Invalid duration string format");
    }
   
    const [, days, hours, minutes, seconds] = durationParts;
   
    const milliseconds =
      (Number(days) || 0) * 24 * 60 * 60 * 1000 +
      (Number(hours) || 0) * 60 * 60 * 1000 +
      (Number(minutes) || 0) * 60 * 1000 +
      (Number(seconds) || 0) * 1000;
   
    return milliseconds;
}

exports.getVideosDetails = async (videosIDs) => {
    const IDs = videosIDs.map( id => `&id=${id}`).join('')
    console.log(IDs)

    // ! REVERT COMENTS
    // const res = await fetch(`https://youtube.googleapis.com/youtube/v3/videos?part=contentDetails&part=snippet${IDs}&key=${TOKEN}`)
    // const json = await res.json()

    // fs.writeFile('detailsAboutVideos.json', JSON.stringify(json, null, 2))

    // to save requests
    let json = await fs.readJSON('detailsAboutVideos.json')

    let videos = []
    if (json.items) {
        videos = json.items.map( video => {
            return {
                id: video.id,
                title: video.snippet.title,
                duration_ms: extractDurationAndConvertToMilliseconds(video.contentDetails.duration)
            }
        })
    }

    return videos
}

exports.downloadVideo = async (id) => {
    await fs.ensureDir('videos')

    return new Promise((res, rej) => {
        const video = ytdl(id, {quality: 'highestaudio'});

        let starttime;

        video.pipe(fs.createWriteStream(`videos/${id}.mp4`));
        video.once('response', () => {
            starttime = Date.now();
        });

        video.on('progress', (chunkLength, downloaded, total) => {
            const percent = downloaded / total;
            const downloadedMinutes = (Date.now() - starttime) / 1000 / 60;
            const estimatedDownloadTime = (downloadedMinutes / percent) - downloadedMinutes;
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`${(percent * 100).toFixed(2)}% downloaded `);
            process.stdout.write(`(${(downloaded / 1024 / 1024).toFixed(2)}MB of ${(total / 1024 / 1024).toFixed(2)}MB)\n`);
            process.stdout.write(`running for: ${downloadedMinutes.toFixed(2)}minutes`);
            process.stdout.write(`, estimated time left: ${estimatedDownloadTime.toFixed(2)}minutes `);
            readline.moveCursor(process.stdout, 0, -1);
        });

        video.on('end', () => {
            process.stdout.write('\n\n');
            res({ id, path: `videos/${id}.mp4`})
        });
    })


    await ytdl(id, {
        quality: 'highestaudio',
    }).pipe(fs.createWriteStream(`videos/${id}.mp4`));
}

exports.downloadSong = async (song) => {
    await fs.ensureDir('songs')

    let stream = ytdl(song.preferred_video.id, {
        quality: 'highestaudio',
    });
      
    let start = Date.now();
    let res = await ffmpeg(stream)
        .audioBitrate(128)
        .save(`songs/${song.title}.mp3`)
        .on('progress', p => {
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`${p.targetSize}kb downloaded`);
        })
        .on('end', () => {
            console.log(`\ndone, thanks - ${(Date.now() - start) / 1000}s`);
        });

    console.log(res)
    return res
}

exports.download_videos = () => {

}