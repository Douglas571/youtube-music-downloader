#!/usr/bin/env node
const fs = require('fs-extra')
const readline = require('readline')
const path = require('path')
const os = require('os')
const YAML = require('yaml')
const ytdl = require('ytdl-core')
const ffmpeg = require('fluent-ffmpeg');
const NodeID3 = require('node-id3')

const DIR = {}

DIR.HOME = os.homedir()
DIR.APPDATA = path.join(process.env.LOCALAPPDATA, 'ymd')
DIR.YMD = path.join(DIR.HOME, 'ymd')
DIR.DOWNLOADS = path.join(DIR.HOME, 'downloads', 'youtube-music-downloader')

function get_instruction_file(file) {
	const full_path = path.join(DIR.YMD, file)
	const data = YAML.parse(fs.readFileSync(full_path, 'utf-8'))

	return data
}

function ensure_dirs(dirs) {
	//console.log('ensuring dirs...')

	for (let dir of dirs) {
		fs.ensureDirSync(dir)
	}
}

function ensure_cache_file(file) {
	fs.ensureFileSync(file)
}

function get_cache(file) {
	console.log(file)
	const rawStr = fs.readFileSync(file, 'utf-8')
	console.log(rawStr)

	let cache
	try {
		cache = JSON.parse(rawStr)

	} catch (err) {
		cache = {
			videos: []
		}
	}
	
	return cache
}

function save_cache(data, file) {
	fs.writeFileSync(file, JSON.stringify(data, null, 4))
}

function extract_id(url) {
	const str = "watch?v="
	const idx = url.indexOf(str)
	const id = url.slice(idx + str.length)
	return id	
}

function download_video(id, folder) {
	return new Promise((res, rej) => {
		const video_path = path.join(folder, `${id}.mp4`)
		const video = ytdl(id, {
		  	quality: 'highestaudio',
		})

		//let starttime;
		video.pipe(fs.createWriteStream(video_path))

		// --------------------------

		video.once('response', () => {
		    //starttime = Date.now();
		})

		video.once('response', () => {
		    //starttime = Date.now();
		    console.log(`downloading ${id}...`)
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
	return new Promise((res, rej) => {
		NodeID3.write(meta, audio_path, err => {
			res()	
		})
	})
}

function read_meta(audio_path) {
	const meta = NodeID3.read(file)
	return meta
}

async function exec(argv) {
	console.log(argv)

	const data = get_instruction_file(argv[0])
	//console.log(DATA_FILE)

	let DOWNLOAD_FOLDER = (data.type == 'album')
		? path.join(DIR.DOWNLOADS, `${data.name}-${data.artist}`)
		: path.join(DIR.DOWNLOADS, `${data.name}`)

	let temp_folder = path.join(DIR.APPDATA, `${data.name}`)
	let temp_videos_folder = path.join(temp_folder, 'videos')
	let temp_audios_folder = path.join(temp_folder, 'audios')
	let temp_cache = path.join(temp_folder, 'cache.json')

	ensure_dirs([
		DIR.APPDATA, 
		DOWNLOAD_FOLDER, 
		temp_videos_folder, 
		temp_audios_folder
	])
	ensure_cache_file(temp_cache)
	const cache = get_cache(temp_cache)

	// Download videos
	for (let item of data.items) {
		//console.log(item)
		let id = item.youtube_id
		//console.log(id)

		if (!id) {
			id = (item.youtube)
				? extract_id(item.youtube)
				: null
		}

		//console.log(id)
		item.youtube_id = id

		//console.log('includes video: ', cache.videos.includes(id))
		if (id && (!cache.videos.includes(id))) {
			await download_video(id, temp_videos_folder)
			cache.videos.push(id)
		}
	}

	const path_to_video = id => path.join(temp_videos_folder, `${id}.mp4`)
	const path_to_audio = id => path.join(temp_audios_folder, `${id}.mp3`)

	// Convert videos
	for (let item of data.items) {
		let id = item.youtube_id

		let { track, title } = item
		track = track || 0
		const file_name = (track < 10)
			? `0${track}.${item.title}.mp3`
			: `${track}.${item.title}.mp3`


		if (id) {
			console.log(`Converting ${id} to mp3...`)
			await convert_video_to_mp3(
				path_to_video(id), 
				path_to_audio(id))
			console.log('end convertion...')
		}

	}

	// Write metadata
	for (let item of data.items) {
		const id = item.youtube_id

		if (id) {
			const meta = {
			    title: item.title,
			    artist: item.artist,
			    //APIC: "./example/mia_cover.jpg",
			    TRCK: item.track
			}

			// TO-DO: Escribir el nombre del album aparte,
			//        dependiendo del tipo
			meta.album = (data.type == 'album')
				? data.name
				: item.album

			await write_meta(path_to_audio(id), meta)

			fs.copySync(
				path_to_audio(id), 
				path.join(DOWNLOAD_FOLDER,
					file_name), 
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
			cache: temp_cache
		}
	}

}

if (module === require.main) {
	const argv = process.argv.slice(2)
	const input = ['bts.yaml']
	exec(input)
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