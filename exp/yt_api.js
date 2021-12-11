require('dotenv').config()
// Experimentando con la api de youtube

// conseguir el id de un video que contenga 
// el audio limpio u oficial de una canción.

const axios = require('axios')
const {google} = require('googleapis')
const {authenticate} = require('@google-cloud/local-auth')
const path = require('path')

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

main()