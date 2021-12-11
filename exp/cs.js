require('dotenv').config()

const { google } = require('googleapis')
const fs = require('fs')
const customsearch = google.customsearch({
	version: 'v1',
	auth: process.env.GOOGLE_CS_KEY,
})

const main = async () => {
	console.log('searchig...')
	const res = await customsearch.cse.list({
		cx: process.env.GOOGLE_CS_ID,
		q: 'halsey manic album cover art'
	})

	console.log('saving...')
	fs.writeFileSync(`cs_res_${Date.now()}.json`, JSON.stringify(res.data, null, 4))
}

main()