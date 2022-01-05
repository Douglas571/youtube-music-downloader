require('dotenv').config({ path: '../.env'})

const {google} = require('googleapis')
const fs = require('fs-extra')
const _ = require('lodash')

const path = require('path')

const ytb = google.youtube({
  version: 'v3',
  auth: process.env.GOOGLE_YT_KEY,
  timeout: (5*1000)
})

exports.fetch_videos = async (tracks) => {
	/*
		TO-DO: Agregar alguna forma de buscar todos los videos
		de una sola vez, tal vez
			ejemplo:
				mapear cada vide a su correspondiente id de track
				colocar todos los video junto de 50 en 50
				buscar los detalles
				procesas los detalles
				asigar videos nuevamente al id de cada track
				escoger video preferido

	*/

	let videos = {}

	for (let t of tracks) {
		/*
			// optener un track
			let t = _.cloneDeep(tracks[0])
		*/
		let query = generate_youtube_query(t)
		let ids = await fetch_ids(query)

		let videos_with_details = await fetch_videos_details(ids)
		let preferred_video = get_preferred_video(
														videos_with_details, 
														t.duration_sec
													)

		// asignar videos al id del track
		videos[t.id] = {
			preferred_video,
			videos: videos_with_details
		}
	}

	fs.writeFileSync('proto/ready-videos.json', JSON.stringify(videos, null, 4))

	return videos

	/*
		Should return a objet that pair tracks id with videos:
				track_id [
					{
						id
						title
						channel
						duration_sec
					}
				]
	*/
}

async function fetch_videos_details(ids) {
	// buscar los detalles de cada video
	console.log('getting details...')

	if (_.isEmpty(ids)) {
		return {}
	}

	let res
	let vds

	try {
		res = await ytb.videos.list({
			id: ids.join(','),
			part: "id, snippet, contentDetails"
		})
	} catch(err) {
		console.log(err)
		console.log("retriying fetch_ids")
		vds = await fetch_videos_details(ids)

		return vds
	}

	fs.writeFileSync('proto/d-videos.json', JSON.stringify(res.data, null, 4))
	vds = res.data.items
					.map(parse_duration)
					.map( v => {
						return {
							id: v.id,
							title: v.snippet.title,
							duration_sec: v.duration_sec
						}
					})

	return vds
}

function parse_duration(v) {
	// parsear la duración del video y trasformarla a Segundos
	const v_copy = _.cloneDeep(v)
	const duration = v_copy.contentDetails.duration

	const min = Number(duration.slice(
		duration.indexOf('PT') + 2, 
		duration.indexOf('M')))

	const sec = Number(duration.slice(
		duration.indexOf('M') + 1, 
		duration.indexOf('S')))

	console.log(`${min}min ${sec}sec`)

	const total = min * 60 + sec

	v_copy.duration_sec = total

	return v_copy
}

async function fetch_ids(query) {
	// buscar los videos 
	console.log(`searching videos: ${query}...`)
	let res
	let ids
	try {
		res = await ytb.search.list({
			part: 'id,snippet',
			q: query
		})
	} catch(err) {
		console.log(err)

		if (err.errors) {
			if (err.errors.some(e => e.reason === "quotaExceeded")) {
				console.log('Cuota de peticiones excedida')
				return []
			}
		}

		console.log("retriying fetch_ids")
		ids = await fetch_ids(query)

		return ids
	}

	// optener un array con los id de los videos coincidentes
	console.log(`1: ${JSON.stringify(res.data.items[0], null, 4)}`)
	ids = res.data.items.map( v => v.id.videoId)

	return ids
}

function generate_youtube_query(track) {
	// optener datos y formar el query de youtube
	let artists = track.artists
	if (Array.isArray(track.artists)) {
		artists = track.artists.join(' ')
	}

	const query = `${track.title} ${artists} official audio`

	return query
}

function get_preferred_video(videos, duration) {
	duraton = Math.floor(duration)
	const video_copy = _.orderBy(_.cloneDeep(videos), ['duration_sec'], ['desc'])

	let tolerance = 0.5
	let founded = false

	const isNearOf = (duration, t) => {
		console.log(`t=${t}`)
		console.log(`duration=${duration}`)
		return (v) => {
			console.log(v)
			let diff = duration - v.duration_sec
			console.log(`diff=${diff} t=${t}`)
			console.log(`((diff >= 0) && (diff <= t))=${((diff >= 0) && (diff <= t))}`)
			console.log(`((diff < 0) && (diff >= t))=${((diff < 0) && (diff >= t))}`)

			if (((diff >= 0) && (diff <= t)) ||
				((diff < 0) && (diff >= -t))) {
				console.log('valid')
				return true
			}

			console.log('invalid')
			return false
		}
	}

	let video
	while(!founded) {
		video = video_copy.find(isNearOf(duration, tolerance))

		if(_.isEmpty(video)) {
			tolerance += 0.5
		} else {
			console.log(video)
			founded = true
		}
	}

	const diff = duration - video.duration_sec
	/*
		console.log(`
		title: ${video.title}
		preferred_duration: ${duration}
		duration: ${video.duration_sec}
		tolerance: ${tolerance}
		diff: ${diff} < ${tolerance} : ${(diff < tolerance)}
			  ${diff} > -${tolerance} : ${(diff > -tolerance)}`)
	*/

	/*
		Should return and id
	*/
	return video
}

function debug(msg, obj) {
	console.log(`DEBUG: ${msg}`)

	if (!_.isEmpty(obj)) {
		console.log(`\t${JSON.stringify(obj, null, 4)}`)
	}

}
