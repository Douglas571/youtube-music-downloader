// api_key = AIzaSyCeNPyaEXxKhrmHor3RX2Gj2ADPhLesAE8
// id_seng = 26f8dc88b37904c0a

/*
	https://www.googleapis.com/customsearch/v1?key=AIzaSyCeNPyaEXxKhrmHor3RX2Gj2ADPhLesAE8&cx=26f8dc88b37904c0a&q=halsey+iichliwp+album+cover+art
*/

const { google } = require('googleapis')
const fs = require('fs')
const customsearch = google.customsearch({
	version: 'v1',
	auth: 'AIzaSyCeNPyaEXxKhrmHor3RX2Gj2ADPhLesAE8',
})

const main = async () => {
	console.log('searchig...')
	const res = await customsearch.cse.list({
		cx: '26f8dc88b37904c0a',
		q: 'halsey manic album cover art'
	})

	console.log('saving...')
	fs.writeFileSync(`cs_res_${Date.now()}.json`, JSON.stringify(res.data, null, 4))
}

main()