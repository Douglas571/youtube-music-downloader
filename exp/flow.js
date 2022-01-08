const _ = require('lodash')
const eventEmiter = require('events')
const render = require('./console')

/*
	el objeto flow debe avisar cuando:
	download:pending
					:waiting
					:start
					:progress
					:end

	converting:start
						:progress
						:end

	writing_metadata

	moving

	done
*/

class Flow extends eventEmiter {
	constructor(args) {
		super()
		this.track = _.cloneDeep(args.track)
		this.folders = _.cloneDeep(args.folders)
		this.cache = args.cache
	}

	download_video() {
		return new Promise((resolve, resject) => {
			this.emit('state', 'downloading')

			setTimeout(resolve, 1000)
		})
	}

	convert_video() {
		return new Promise((resolve, resject) => {
			this.emit('state', 'converting')

			setTimeout(resolve, 1000)
		})
	}

	write_metadata() {
		return new Promise((resolve, resject) => {
			this.emit('state', 'writing metadata')

			setTimeout(resolve, 1000)
		})
	}

	init() {
		return new Promise((resolve, reject) => {
			this.download_video()
				.then( res => this.convert_video(res))
				.then( res => this.write_metadata(res))
				.then( res => {
					this.emit('state', 'done')
					resolve(res)
				})	

				.catch( err => reject(err))
		})
	}
}

async function main() {
	let data = {}

	let album = {
		name: 'some name',
		tracks: [
			{
				id: 'someid1',
				title: 'some song',
				track_number: 0
			},
			{
				id: 'someid2',
				title: 'some song 2',
				track_number: 1
			}
		]
	}
	let folders = {}
	let cache = {}

	let lines_rendered = 0

	let flows = album.tracks.map((t, idx) => {
		data[t.id] = {
			id: t.id,
			title: t.title,
			track: t.track_number,
			state: 'pending'
		}

		let flow = new Flow({
			track: {
				id: t.id,
				video: t.id,
				title: t.title,
				album: album.name,
				performerArtist: album.artist,
				artists: t.artists,
				year: album.year,
			},
			folders,
			cache
		})

		flow.on('trying', (time) => {
			data[t.id].state = `trying ${time}`
		})

		flow.on('error', (err) => {
			data[t.id].state = err
		})

		flow.on('state', (state) => {
			data[t.id].state = state

			render(data, lines_rendered)
				.then( l => {
					lines_rendered = l
				})
		})

		return flow.init()
	})
}

main()