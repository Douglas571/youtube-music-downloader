const fs = require('fs-extra')
const path = require('path')
const os = require('os')
const YAML = require('yaml')

const cli = require('./index.js')

const HOME_DIR = os.homedir()
const APPDATA_DIR = path.join(process.env.LOCALAPPDATA, 'ymd')
const YMD_DIR = path.join(HOME_DIR, 'ymd')
const DOWNLOADS_DIR = path.join(HOME_DIR, 'downloads', 'youtube-music-downloader')

function create_instructions_file(dir, name, data) {
	fs.ensureDirSync(dir)
	fs.writeFileSync((path.join(dir, name)), YAML.stringify(data, null, 4))
}

describe('CLI test', () => {
	it('Should create all the folders', async () => {
		console.log(cli.DIR)
		const input = ['to-download.yaml']

		const album = {
			type: 'album',
			name: 'test',
			artist: 'test-artist',
			items: [
				{
					title: 'song 1',
					ft: ['name1', 'name2']
				},
				{
					title: 'song 2',
					ft: 'name1'
				},
				{
					title: 'song 3',
				}

			]
		}

		create_instructions_file(YMD_DIR, input[0], album)

		const output = await cli.exec(input)

		expect(output.out_folder).toEqual(path.join(DOWNLOADS_DIR, `${album.name}-${album.artist}`))

		const TEMP_DIR = path.join(APPDATA_DIR, `${album.name}`)
		const VIDEOS_DIR = path.join(TEMP_DIR, 'videos')
		const AUDIOS_DIR = path.join(TEMP_DIR, 'audios')
		const cache_file = path.join(TEMP_DIR, 'cache.json')

		expect(fs.existsSync(output['out_folder'])).toEqual(true)
		expect(fs.existsSync(APPDATA_DIR)).toEqual(true)

		expect(fs.existsSync(VIDEOS_DIR)).toEqual(true)
		expect(fs.existsSync(AUDIOS_DIR)).toEqual(true)

		expect(fs.existsSync(cache_file)).toEqual(true)
	})

	it('Should download a song from playlist', async () => {
		const playlist = {
			type: 'playlist',
			name: 'bts',
			items: [
				{
					title: 'Dynamite',
					youtube_id: 'OiMWFojB9Ok',
					artist: 'BTS',
					album: 'Dynamite',
					track: 1

				},
				{
					title: 'Butter',
					youtube_id: "Uz0PppyT7Cc",
					artist: 'BTS',
					album: 'Butter',
					track: 10
				}
			]
		}

		const input = ['bts.yaml']
		create_instructions_file(YMD_DIR, input[0], playlist)

		const output = await cli.exec(input)

		const path_to_video = id => path.join(output.appdata.videos, `${id}.mp4`)

		const path_to_audio = id => path.join(output.appdata.audios, `${id}.mp3`)

		const path_to_mp3 = item => {
			
			let ptm
			const {track, title} = item
			if (track < 10){
				ptm = path.join(output.out_folder, `0${track}.${title}.mp3`)
			} else {
				ptm = path.join(output.out_folder, `${track}.${title}.mp3`)
			}

			return ptm
		}

		const cache = JSON.parse(fs.readFileSync(output.appdata.cache, 'utf-8'))

		

		playlist.items.forEach( async item => {
			const id = item.youtube_id
			expect(fs.existsSync(path_to_video(id))).toEqual(true)
			expect(fs.existsSync(path_to_audio(id))).toEqual(true)
			
			expect(cache.videos.includes(id)).toEqual(true)
			expect(cache.audios.includes(id)).toEqual(true)

			expect(fs.existsSync(path_to_mp3(item))).toEqual(true)

			const meta = cli.read_meta(path_to_mp3(item))
			console.log(meta)
		})
		
	})
})