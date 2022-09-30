#!/usr/bin/env node
/* 
	BIG NOTE: The program know what to download based on an "instruction file" 
	that should be in "~home/ymd" folder saved in variable "DIR.YMD".
 	
 	Currently (29-09-22) I'm working in a script for generate that 
 	instruction file from a spotify playlist or album, and that script
 	is in "exp/proto_meta.js".
*/

require('dotenv').config()

//console.log(process.env)

const fs = require('fs-extra')
const _ = require('lodash')
const readline = require('readline')
const path = require('path')
const os = require('os')
const YAML = require('yaml')
const ytdl = require('ytdl-core')
const ffmpeg = require('fluent-ffmpeg');
const NodeID3 = require('node-id3')

const Covers = require('./covers')

const DIR = {}

DIR.HOME = os.homedir()
DIR.APPDATA = path.join(process.env.LOCALAPPDATA, 'ymd')
DIR.YMD = path.join(DIR.HOME, 'ymd')
DIR.DOWNLOADS = path.join(DIR.HOME, 'downloads', 'youtube-music-downloader')

/**
 * Retrive the file where is the music metadata
 * and video ids
 * @param String: Filename of instruction_file
 */
function get_instruction_file(instruction_file) {
	const full_path = path.join(DIR.YMD, instruction_file)
	let data

	if (full_path.endsWith('yaml')) {
		data = YAML.parse(fs.readFileSync(full_path, 'utf-8'))
	} else {
		data = JSON.parse(fs.readFileSync(full_path, 'utf-8'))
	}

	return data
}

function ensure_dirs(dirs) {
	//console.log('ensuring dirs...')

	for (let dir of dirs) {
		fs.ensureDirSync(dir)
	}
}

function ensure_cache_file(cache_path) {
	fs.ensureFileSync(cache_path)
}

function get_cache(cache_path) {
	console.log(cache_path)
	ensure_cache_file(cache_path)
	const rawStr = fs.readFileSync(cache_path, 'utf-8')
	console.log(rawStr)

	let cache
	try {
		cache = JSON.parse(rawStr)

	} catch (err) {
		cache = {
			videos: [],
			audios: [],
			covers: {}
		}
	}
	
	return cache
}

function save_cache(data, cache_path) {
	console.log(`the cache in save_cache is: ${cache_path}`)
	fs.writeFileSync(cache_path, JSON.stringify(data, null, 4))
}

function extract_id(url) {
	const id = url.split('=')[1]
	return id	
}

function old_$download_video(id, folder, op={}) {

	if (_.isEmpty(op.timeout)) {
		op.timeout = 1.5 * 60 * 1000
	} else {
		console.log
		op.timeout = op.timeout * 60 * 1000
	}

	return new Promise((res, rej) => {
		const video_path = path.join(folder, `${id}.mp4`)

		const video = ytdl(id, {
		  	quality: 'highestaudio',
		})

		//res(video_path)

		//let starttime;
		video.pipe(fs.createWriteStream(video_path))

		// --------------------------

		let timeout_id = setTimeout(() => {
			console.log('destroying');
			video.destroy()
			let err = new Error(`timeout: ${id}`)
			err.name = ('timeout')
			rej(err)
		}, op.timeout)

		video.on('error', (err) => {
			rej(err)
		})

		video.once('response', () => {
		    //starttime = Date.now();
		    clearTimeout(timeout_id)
		    console.log(`response downloading ${id}...`)
		})

		video.on('progress', (chunkLength, downloaded, total) => {
   		    /*
   		    	const percent = downloaded / total;
				const downloadedMinutes = (Date.now() - starttime) / 1000 / 60;
				const estimatedDownloadTime = (downloadedMinutes / percent) - downloadedMinutes;
				readline.cursorTo(process.stdout, 0);
				process.stdout.write(`${(percent * 100).toFixed(2)}% downloaded `);
				process.stdout.write(`(${(downloaded / 1024 / 1024).toFixed(2)}MB of ${(total / 1024 / 1024).toFixed(2)}MB)\n`);
				process.stdout.write(`running for: ${downloadedMinutes.toFixed(2)}minutes`);
				process.stdout.write(`, estimated time left: ${estimatedDownloadTime.toFixed(2)}minutes `);
				readline.moveCursor(process.stdout, 1, -1);
   		    */
		})

		video.on('end', () => {
		    // process.stdout.write('\n\n');
		    console.log(`end ${id} download.`)
		    res(video_path)
		})
	})
}

function convert_video_to_mp3(src, dest) {
	return new Promise((res, rej) => {
		const video = fs.createReadStream(src)
		ffmpeg(video)
			.audioBitrate(128)
			.save(dest)
			.on('end', () => {
				res()
			})
	})
}

function write_meta(meta, audio_path) {
	console.log(`writing meta: ${JSON.stringify(meta, null, 4)}`)
	return new Promise((res, rej) => {
		NodeID3.write(meta, audio_path, err => {
			if (err) {
				console.log(err)
				rej()
			}
			//console.log('write successfull')
			res()	
		})
	})
}

function read_meta(audio_path) {
	const meta = NodeID3.read(audio_path)
	return meta
}

async function prepare_folders(data) {
	let DOWNLOAD_FOLDER = (data.type == 'album')
		? path.join(DIR.DOWNLOADS, `${data.name}-${data.artist}`)
		: path.join(DIR.DOWNLOADS, `${data.name}`)

	let temp_folder = path.join(DIR.APPDATA, `${data.name}`)
	let temp_covers_folder = path.join(temp_folder, 'covers')
	let temp_videos_folder = path.join(temp_folder, 'videos')
	let temp_audios_folder = path.join(temp_folder, 'audios')
	let temp_cache = path.join(temp_folder, 'cache.json')
}

async function download_playlist(data) {
	let DOWNLOAD_FOLDER = (data.type == 'album')
		? path.join(DIR.DOWNLOADS, `${data.name}-${data.artist}`)
		: path.join(DIR.DOWNLOADS, `${data.name}`)

	let temp_folder = path.join(DIR.APPDATA, `${data.name}`)
	let temp_covers_folder = path.join(temp_folder, 'covers')
	let temp_videos_folder = path.join(temp_folder, 'videos')
	let temp_audios_folder = path.join(temp_folder, 'audios')
	let temp_cache = path.join(temp_folder, 'cache.json')

	console.log('ensuring dirs...')
	ensure_dirs([
		DIR.APPDATA, 
		DOWNLOAD_FOLDER, 
		temp_videos_folder, 
		temp_audios_folder,
		temp_covers_folder
	])
	const cache = get_cache(temp_cache)

	const path_to_cover = id => path.join(temp_covers_folder, `${id}.png`)
	const path_to_video = id => path.join(temp_videos_folder, `${id}.mp4`)
	const path_to_audio = id => path.join(temp_audios_folder, `${id}.mp3`)
	const path_to_mp3 = item => {
		let file_name

		let { track_number, title } = item
		track_number = track_number || 0
		file_name = (track_number < 10)
			? `0${track_number}.${title}.mp3`
			: `${track_number}.${title}.mp3`

		return file_name
	}

	
	// Download videos
	let skip_vd = true
	console.log('downloading videos...')
	for (let item of data.items) {
		if (skip_vd) continue 

		console.log(item.id)

		let id = item?.preferred_video.id

		// TO-DO: Write a function for ensure that id is asigned.
		// IMPORTANT: Ensure that id is asigned for posterior usage.
		if (!id) {
			id = (item.youtube)
				? extract_id(item.youtube)
				: null
			item.youtube_id = id
		}

		if (id) {
			console.log('check if: ', id, ' is in cache.')
			if (!(cache.videos.includes(id))) {
				console.log('download the video')

				const op = {
					ids: {video: id, track: id}, 
					folder: temp_videos_folder, 
					cache, 
					timeout: 1.5, 
					cache_path: temp_cache
				}

				await download_video(op)

				cache.videos.push(id)
				save_cache(cache, temp_cache)
			} else {
				console.log("the video alredy exists: ", id)
			}
			// {ids, folder, cache, timeout, cache_path}
				
		}
	}

	
	// Convert videos
	let skip_vc = true
	console.log('Converting videos...')
	for (let item of data.items) {
		if (skip_vc) continue 

		let id = item.preferred_video.id

		if (id && !cache.audios.includes(id) && cache.videos.includes(id)) {
			console.log('converting: ', id)
			await convert_video_to_mp3(
				path_to_video(id), 
				path_to_audio(id))

			cache.audios.push(id)
			save_cache(cache, temp_cache)
		}
	}

	// Download cover
	console.log('Downloading covers...')
	if (data.type == 'album') {
		// TO-DO: Write a single cover

	} else {
		for (let item of data.items) {
			// find cover url
			const l = item.cover.split('/').length
			const id = item.cover.split('/')[(l-1)]

			/* for now, the playlist form spotify should include cover

			let search = (item.title)? `${item.title}`: ''
			search += (item.artist)? ` ${item.artist}`: ''
			search += (item.year)? ` ${item.year}`: ''
			let url
			
			if(!item.cover) {
				item.cover = {}

				if(!cache.covers[search]) {
					cache.covers[search] = {}
				}

				if(cache.covers[search].hasOwnProperty('url')) {
					url = cache.covers[search].url

				} else {
					url = await Covers.find(search)
					cache.covers[search].url = url
				}

				item.cover.url = url
				save_cache(cache, temp_cache)
			}
			*/

			// download the cover
			if (!cache.covers[id]) {
				cache.covers[id] = {}
			}

			if (!(cache.covers[id].hasOwnProperty('file_path'))) {
				console.log('cover not found: ', id)
				await Covers.download(item.cover, path_to_cover(id))	
				cache.covers[id].file_path = path_to_cover(id)
			}
			
			// asigne the cover file path to item
			const cover = item.cover
			item.cover = { cover, file_path: path_to_cover(id) }
			save_cache(cache, temp_cache)
		}

	}


	// Write metadata
	console.log('Writing metadata...')
	for (let item of data.items) {
		const id = item.preferred_video.id
		console.log('writing: ', id)

		if (id && cache.videos.includes(id)) {

			const meta = {
			    title: item.title,
			    artist: item.artists,
			    performerInfo: item.artists,
			    APIC: item.cover.file_path,
			    trackNumber: item.track,
			    year: item.year,
			    genre: item.genre,
			}

			// TO-DO: Escribir el nombre del album aparte,
			//        dependiendo del tipo

			meta.album = item.album || meta.album

			await write_meta(meta, path_to_audio(id))

			console.log('copying: ', id)
			fs.copySync(
				path_to_audio(id), 
				path.join(
					DOWNLOAD_FOLDER,
					path_to_mp3(item)), 
				{ overwrite: true })
		}
	}


	save_cache(cache, temp_cache)

	return {
		'out_folder': DOWNLOAD_FOLDER,
		new_data: data,
		appdata: {
			videos: temp_videos_folder,
			audios: temp_audios_folder,
			covers: temp_covers_folder,
			cache: temp_cache
		}
	}
}

async function download_video(op, retries = 0) {
	const {
		ids, 
		folder, 
		cache, 
		timeout, 
		cache_path
	} = op

	let video_path
	let results = {}

	try {
		console.log(`starting download ${ids.video}`)
		video_path = await old_$download_video(ids.video, folder, {timeout})
		results = {
			video_path,
			ids
		}

		cache.videos.push(ids.video)
		console.log(`the cache path in videos is: ${cache_path}`)
		save_cache(cache, cache_path)

	} catch(err) {
		if (err.name !== 'timeout') {
			console.log(err)
		}

		if (retries <= 10) {
			console.log(`retrying download ${ids.video}, retry# ${retries + 1}`)
			results = await download_video({ids, folder, cache, timeout, cache_path}, retries + 1)
		} else {
			//console.log(`timeout, retries exceded for ${ids.video}`)
			throw new Error(`timeout, retries exceded for ${ids.video}`)
		}
	}

	return results
}

async function download_all_videos({album, folder, timeout, skip, steps, cache_path}, cache = {}) {
	// TO-DO: cazar el error no atrapada en promsa :'(

	skip = (skip)? skip : 0
	steps = (steps)? steps : 4

	if(!steps) {
		steps = 4
	}

	if((skip + steps) > album.totalTracks) {
		let downloaded = cache.videos.length
		steps = album.totalTracks - downloaded
	}

	const pending_videos = []

	let idx = skip
	while(pending_videos.length < steps) {
		if(_.isEmpty(album.tracks[idx])) {
			break
		}

		let track = album.tracks[idx]
		const ids = {
			track: track.id,
			video: track.preferred_video.id
		}

		if (!cache.videos.includes(ids.video)) {
			//console.log(`added ${ids.video}\nidx:${idx}`)
			pending_videos.push(new Promise((res, rej) => {
				setTimeout(() => {
					download_video({ids, folder, cache, timeout, cache_path})
						.then( results => res(results))
						.catch( err => rej(err))
				}, ((pending_videos.length - 1) * 3 * 1000))
			}))
		}

		idx += 1


	}

	const video_results = await Promise.allSettled(pending_videos)
	console.log(video_results)

	return video_results
}

async function convert_all_videos(options) {
	let results
	const { album,
			folders,
			cache } = options

	console.log('Converting videos...')
	for (let track of album.tracks) {
		let id = track.preferred_video.id

		if (cache.videos.includes(id) && 
			!cache.audios.includes(id)) {
			console.log(`converting ${id}`)
			await convert_video_to_mp3(
				path.join(folders.videos, `${id}.mp4`), 
				path.join(folders.audios, `${id}.mp3`))

			cache.audios.push(id)
			save_cache(cache, folders.cache)
		}

	}

	results = 'convertion good'

	return results
}

async function set_all_metadata(album, folders, cache = {}) {
	let results

	let destiny_path = track => {
		let number = (track.track_number < 10)
			? `0${track.track_number}`
			: track.track_number

		let file_name = `${number}.${track.title}.mp3`
		let out = path.join(folders.downloads, file_name)

		return out
	}

	let pending_writting = []

	for (let t of album.tracks) {
		let artist = (Array.isArray(t.artists))
						? t.artists.join(', ')
						: t.artists

		const meta = {
		    title: t.title,
		    album: album.name,
		    artist: artist,
		    performerInfo: album.artist,
		    APIC: cache.covers[album.cover],
		    trackNumber: t.track_number,
		    year: album.year,
		    genre: t.genre,
		}

		let id = t.preferred_video.id
		if (cache.audios.includes(id)) {
			let audio_path = path.join(folders.temp.audios, `${id}.mp3`)
			pending_writting.push(new Promise((resolve, rej) => {
				write_meta(meta, audio_path)
					.then(res => {
						fs.copy(audio_path, destiny_path(t), 
							{ overwrite: true })
						.then(res => resolve('good'))
					})
			}))
		}
	}	

	let writting_results = await Promise.allSettled(pending_writting)
		console.log(writting_results)

	results = 'good copy writting'
	return results	
}

async function download_album(album, op = {}) {
	let results = {}

	let folders = {
		downloads: path.join(DIR.DOWNLOADS, `${album.artist} - ${album.name}(${album.year})`),
		temp: {
			root: path.join(DIR.APPDATA, `${album.name}`)
		},
	}

	folders.temp.videos = path.join(folders.temp.root, 'videos')
	folders.temp.audios = path.join(folders.temp.root, 'audios')
	folders.temp.covers = path.join(folders.temp.root, 'covers')
	folders.temp.cache  = path.join(folders.temp.root, 'cache.json')

	ensure_dirs([
		folders.downloads,
		folders.temp.videos,
		folders.temp.audios,
		folders.temp.covers
	])

	console.log(`downloading album: ${album.name}`)

	console.log('downloading videos')
	const cache = get_cache(folders.temp.cache)

	const video_results = await download_all_videos(
			{ 
				album, 
				folder: folders.temp.videos,
				timeout: op.video_timeout,
				stesps: 3,//steps: 1,
				cache_path: folders.temp.cache
			},
			cache)

	const audio_results = await convert_all_videos(
		{
			album,
			folders: folders.temp,
			cache
		})
	console.log(audio_results)
	console.log('downloading cover')
	if(_.isEmpty(cache.covers[album.cover])) {
		let cover_results = await Covers.download(
			album.cover, 
			path.join(folders.temp.covers, 'cover.png'))
		console.log(cover_results)
		cache.covers[album.cover] = cover_results
	}

	console.log('setting metadata')
	const meta_results = await set_all_metadata(album, folders, cache)

	save_cache(cache, folders.temp.cache)
	results.folders = folders
	return results
}

async function exec(argv) {
	console.log(argv)

	const data = get_instruction_file(argv[0])
	//console.log(data)
	//console.log(DATA_FILE)

	let c = 0;
	setInterval(() => {
		console.log(c)
		c++
	}, 1000)

	let results
	if (data.type == 'album') {
		results = await download_album(data)
	} else {
		results = await download_playlist(data)
	}

	console.log('terminate!')
	//console.log(`the results are: ${JSON.stringify(results, null, 4)}`)

 	//exec(argv) // don't do this :P

	return results
}

if (module === require.main) {
	const argv = process.argv
	const input = [argv[2]]
	exec(input).then( res => {process.exit(1)})
}

module.exports = {
	DIR,
	exec,
	write_meta,
	read_meta
}