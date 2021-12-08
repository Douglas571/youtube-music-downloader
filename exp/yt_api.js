// Experimentando con la api de youtube

// conseguir el id de un video que contenga 
// el audio limpio u oficial de una canción.

// GET https://www.googleapis.com/youtube/v3/search
// api-key= AIzaSyCeNPyaEXxKhrmHor3RX2Gj2ADPhLesAE8
// id-client= 1075337446559-40qti8692ehtjmdq52sdsfd7e62q5u4q.apps.googleusercontent.com

/*
	https://www.googleapis.com/customsearch/v1?key=AIzaSyCeNPyaEXxKhrmHor3RX2Gj2ADPhLesAE8&cx=017576662512468239146:omuauf_lfve&q=onerepublic+human+album+cover+2021
*/

/*
	https://www.googleapis.com/youtube/v3/search?
		key=AIzaSyCeNPyaEXxKhrmHor3RX2Gj2ADPhLesAE8
		&part=id,snippet
		&q=lauren+jauregui+colors+audio

	https://www.googleapis.com/youtube/v3/search?key=AIzaSyCeNPyaEXxKhrmHor3RX2Gj2ADPhLesAE8&part=id,snippet&q=lauren+jauregui+colors+audio

	https://www.googleapis.com/youtube/v3/search?key=AIzaSyCeNPyaEXxKhrmHor3RX2Gj2ADPhLesAE8&part=id,snippet&q=billie+eilish+love+you+audio+clean+version

	https://www.googleapis.com/youtube/v3/search?key=AIzaSyCeNPyaEXxKhrmHor3RX2Gj2ADPhLesAE8&part=id,snippet&q=onerepublic+human+audio+official+audio+clean
*/

const axios = require('axios')
const {google} = require('googleapis')
const {authenticate} = require('@google-cloud/local-auth')
const path = require('path')

const main = async () => {
	const ytb = google.youtube({
	    version: 'v3',
	    auth: 'AIzaSyCeNPyaEXxKhrmHor3RX2Gj2ADPhLesAE8'
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