require('dotenv').config({ path: '../.env'})
// Experimentando con la api de youtube

// conseguir el id de un video que contenga 
// el audio limpio u oficial de una canción.

const axios = require('axios')
const {google} = require('googleapis')
const {authenticate} = require('@google-cloud/local-auth')
const path = require('path')
const _ = require('lodash')

const main = async () => {
	const ytb = google.youtube({
	    version: 'v3',
	    auth: process.env.GOOGLE_YT_KEY
	})

	/*
		
	const auth = await authenticate({
	    keyfilePath: path.join(__dirname, '../client-secret.json'),
	    scopes: ['https://www.googleapis.com/auth/youtube'],
	});
	google.options({auth});
	*/

	console.log('searching video...')
	const res = await ytb.search.list({
		part: 'id,snippet',
		q: 'Lauren Jauregui colors audio'
	})

	console.log(JSON.stringify(res.data, null, 4))

}

const fs = require('fs')
function get_search(num) {
	let json = ''
	let yt_res = []
	try {
		json = fs.readFileSync(`ys/${num}.json`, 'utf-8')
	} catch(err) {
		console.log(err)
	}

	yt_res = JSON.parse(json)

	return yt_res
}

async function GETTING_VIDEO_DETAILS() {
	console.log(process.env.GOOGLE_YT_KEY)
	const ytb = google.youtube({
	    version: 'v3',
	    auth: process.env.GOOGLE_YT_KEY
	})	
	
	let num = 2
	const preferred_duration = Math.floor(185)
	const input = `/d${num}.json`
	const out_sort = `ds${num}.json`

	async function fetch_video_data() {
		const search = get_search(num)
		//console.log(search)

		const { items } = search

		const id = []

		items.forEach( it => id.push(it.id.videoId))

		const res = await ytb.videos.list({
			id: id.join(','),
			part: "id, snippet, contentDetails"
		})

		const vds = res.data

		fs.writeFileSync(input, JSON.stringify(vds, null, 4))
		console.log(vds)
	}


	let video_details = []
	let json = ''
	try {
		json = fs.readFileSync(input, 'utf-8')
		video_details = JSON.parse(json).items

	} catch(err) {
		await fetch_video_data()
		json = fs.readFileSync(input, 'utf-8')
		video_details = JSON.parse(json).items
	}

	//console.log(video_details)

	video_details = video_details.map( v => {
		const duration = v.contentDetails.duration

		const min = Number(duration.slice(
			duration.indexOf('PT') + 2, 
			duration.indexOf('M')))

		const sec = Number(duration.slice(
			duration.indexOf('M') + 1, 
			duration.indexOf('S')))

		console.log(`${min}min ${sec}sec`)

		const total = min * 60 + sec

		return {
			id: v.id,
			title: v.snippet.title,
			duration_sec: total
		}
	})
	console.log('unsorted')
	console.log(JSON.stringify(video_details, null, 4))

	video_details = _.orderBy(video_details, ['duration_sec'], ['asc'])
	
	console.log('sorted')
	console.log(JSON.stringify(video_details, null, 4))

	const pv = get_preferred_video(video_details, preferred_duration)

	fs.writeFileSync(out_sort, JSON.stringify({
		pv,
		video_details,
	}, null, 4))

}

function get_preferred_video(videos, duration) {
	const video_copy = _.orderBy(_.cloneDeep(videos), ['duration_sec'], ['desc'])

	let tolerance = 1
	let founded = false

	const isNearOf = (duration, t) => {
		console.log(`t=${t}`)
		return (v) => {
			console.log(v)
			let diff = duration - v.duration_sec
			console.log(`diff=${diff} t=${t}`)

			if (((diff >= 0) && (diff <= t)) ||
				((diff <= 0) && (diff >= t))) {
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
		console.log(video)

		if(_.isEmpty(video)) {
			tolerance += 1
		} else {
			founded = true
		}
	}

	const diff = duration - video.duration_sec
	console.log(`
		title: ${video.title}
		preferred_duration: ${duration}
		duration: ${video.duration_sec}
		tolerance: ${tolerance}
		diff: ${diff} < ${tolerance} : ${(diff < tolerance)}
			  ${diff} > -${tolerance} : ${(diff > -tolerance)}`)

	/*
		Should return and id
	*/
	return video
}

GETTING_VIDEO_DETAILS()