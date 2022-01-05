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