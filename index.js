#!/usr/bin/env node
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

function get_instruction_file(instruction_file_path) {
	const full_path = path.join(DIR.YMD, instruction_file_path)
	let data

	if (instruction_file_path.endsWith('yaml')) {
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
			rej(new Error(`timeout: ${id}`))
		}, op.timeout)

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
	ensure_cache_file(temp_cache)
	const cache = get_cache(temp_cache)

	const path_to_cover = id => path.join(temp_covers_folder, `${id}.png`)
	const path_to_video = id => path.join(temp_videos_folder, `${id}.mp4`)
	const path_to_audio = id => path.join(temp_audios_folder, `${id}.mp3`)
	const path_to_mp3 = item => {
		let file_name

		let { track, title } = item
		track = track || 0
		file_name = (track < 10)
			? `0${track}.${item.title}.mp3`
			: `${track}.${item.title}.mp3`

		return file_name
	}

	// Download videos
	console.log('downloading videos...')
	for (let item of data.tracks) {

		let id = item.youtube_id

		// TO-DO: Write a function for ensure that id is asigned.
		// IMPORTANT: Ensure that id is asigned for posterior usage.
		if (!id) {
			id = (item.youtube)
				? extract_id(item.youtube)
				: null
			item.youtube_id = id
		}

		if (id && (!cache.videos.includes(id))) {
			await download_video(id, temp_videos_folder)
			cache.videos.push(id)
			save_cache(cache, temp_cache)
		}
	}

	// Convert videos
	console.log('Converting videos...')
	for (let item of data.tracks) {
		let id = item.youtube_id

		if (id && (!cache.audios.includes(id))) {
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
		for (let item of data.tracks) {
			// find cover url
			const id = item.youtube_id
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

			// download the cover
			if (!(cache.covers[search].hasOwnProperty('file_path'))) {
				await Covers.download(url, path_to_cover(id))	
				cache.covers[search].file_path = path_to_cover(id)

			}
			
			// asigne the cover file path to item
			item.cover.file_path = path_to_cover(id)
			save_cache(cache, temp_cache)
		}

	}


	// Write metadata
	console.log('Writing metadata...')
	for (let item of data.tracks) {
		const id = item.youtube_id

		if (id) {

			const meta = {
			    title: item.title,
			    artist: item.artist,
			    //performerInfo: performerArtist,
			    APIC: item.cover.file_path,
			    trackNumber: item.track,
			    year: item.year,
			    genre: item.genre,
			}

			// TO-DO: Escribir el nombre del album aparte,
			//        dependiendo del tipo

			meta.album = (data.type == 'album')
				? data.name
				: item.title

			meta.album = item.album || meta.album

			await write_meta(meta, path_to_audio(id))

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

async function download_video({ids, folder, cache, timeout}, retries = 0) {
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

	} catch(err) {
		if (retries <= 2) {
			console.log(`retrying download ${ids.video}, retry# ${retries + 1}`)
			results = await download_video({ids, folder, cache, timeout}, retries + 1)
		} else {
			//console.log(`timeout, retries exceded for ${ids.video}`)
			throw new Error(`timeout, retries exceded for ${ids.video}`)
		}
	}

	return results
}

async function download_all_videos({album, folder, timeout, skip, steps}, cache = {}) {
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
		let track = album.tracks[idx]
		const ids = {
			track: track.id,
			video: track.preferred_video.id
		}

		if (!cache.videos.includes(ids.video)) {
			//console.log(`added ${ids.video}\nidx:${idx}`)
			pending_videos.push(new Promise((res, rej) => {
				setTimeout(() => {
					download_video({ids, folder, cache, timeout})
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
		let file_name = `${track.track_number}.${track.title}.mp3`
		let out = path.join(folders.downloads, file_name)

		return out
	}

	let pending_writting = []

	for (let t of album.tracks) {
		const meta = {
		    title: t.title,
		    artist: album.artist,
		    //performerInfo: performerArtist,
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
		downloads: path.join(DIR.DOWNLOADS, `${album.name}-${album.artist}`),
		temp: {
			root: path.join(DIR.APPDATA, `${album.name}`)
		},
	}

	folders.temp.videos = path.join(folders.temp.root, 'videos')
	folders.temp.audios = path.join(folders.temp.root, 'audios')
	folders.temp.covers = path.join(folders.temp.root, 'covers')
	folders.temp.cache  = path.join(folders.temp.root, 'cache.json')

	console.log(`downloading album: ${album.name}`)

	console.log('downloading videos')
	const cache = get_cache(folders.temp.cache)

	const video_results = await download_all_videos(
			{ 
				album, 
				folder: folders.temp.videos,
				timeout: op.video_timeout,
				steps: 3
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

	let results
	if (data.type == 'album') {
		results = await download_album(data)
	} else {
		results = await download_playlist(data)
	}

	console.log(`the results are: ${JSON.stringify(results, null, 4)}`)

	return results
}

if (module === require.main) {
	const argv = process.argv.slice(2)
	const input = ['orh.json']
	exec(input).then( res => {process.exit(1)})
	
}

module.exports = {
	DIR,
	exec,
	write_meta,
	read_meta
}

// input - un archivo de instrucciónes

// leer archivo de instrucciónes

// si type es "album"
	// crear capeta "temp/{album_title}/" "temp/{album_title}/videos" "temp/{album_title}/audios"
	// Si no hay cache, crear caché en temp/{album_title}/cache.json
	// si hay internet
		// descargar cover y guardar en temp/{album_title}/cover.png
		// tomar un item
			 // si hay id y no está en caché
			 	// si hay internet
			 		// descargar video en la carpeta temp/{album_title}/videos/{id}.mp4
			 			// si se descargó exitosamente
			 				// cachear id en temp/{album_title}/cache.json
			 		// si no
			 			// repetir descarga
			 	// si no hay internet
			 		// saltar item
		// repetir para cada item

		// tomar un item
			// si id del item está en caché
				// buscar video correspondiente en temp/{album_title}/videos/{id}.mp4
				// convertir a mp3 y guardar en temp/{album-title}/audios/{id}.mp3
				// buscar cover en temp/{album_title}/cover.png
				// colocar cover
				// editar metadatos
				// copiar a download/{album_title}-{main_artist}/0{track}.{title}.mp3
			// saltar item

// si type es "playlist"
	// crear capeta "temp/folder/" "temp/folder/videos" "temp/folder/audios" "temp/folder/covers"
	// si existe temp/folder/cache.json
		// cargar cache

	// si no, crear cache file en temp/folder/cache.json

	// tomar un item
		// si hay id
			// si hay internet y no está en caché
				// descargar video y guardar en temp/folder/videos/{id}.mp4
				// descargar cover en temp/folder/covers/{id}.png
				


		// si no hay id

// output - una carpeta en descargas/ymd con los audios formateados