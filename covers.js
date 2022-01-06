const { google } = require('googleapis')
const fs = require('fs')
const axios = require('axios')

const api_key = process.env.GOOGLE_CS_KEY
const custom_search_engine_id = process.env.GOOGLE_CS_ID

const customsearch = google.customsearch({
	version: 'v1',
	auth: api_key,
})

async function find(search) {
	let url
	console.log(search)
	// TO-DO: Get a image url
	console.log('searchig...')
	const res = await customsearch.cse.list({
		cx: custom_search_engine_id,
		q: search
	})

	console.log('saving...')
	//fs.writeFileSync(`cs_cache/${search}.json`, JSON.stringify(res.data, null, 4))

	url = res.data.items[0].pagemap.cse_image[0].src

	return url
}

function download(url, file_path) {
	return new Promise((res, rej) => {
		let image_path

		// TO-DO: Download the image in folder/{id}.png
		console.log('downloading: ', url)
		axios.get(url, {
			responseType: 'stream'
		}).then(({ data }) => {
			data.pipe(fs.createWriteStream(file_path))
			data.on('end', () => {
				console.log('finish downloaded: ', url)
				res(file_path)
			})
		}).catch( err => {
			console.log(err)
			console.log('retrying: url')

			download(url, file_path).then(img_path => res(img_path))

		})
	})
}

module.exports = {
	find,
	download
}