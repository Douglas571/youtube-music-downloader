const readline = require('readline')
const { stdin: input, stdout: output } = require('process');

function render(data, back=0) {
	return new Promise((resolve, resject) => {
		if(back > 0) {
			back
		}

		readline.moveCursor(output, 0, -back)
		readline.clearScreenDown(output)

		let lines = 0
		for (let id in data) {
			let t = data[id]
			output.write(`${t.title}: ${t.state}\n`)		
			lines++
		}

		resolve(lines)
	})
		
}

module.exports = render

async function init() {
	//let rl = readline.createInterface({ input, output })

	let data = {
		tracks: [
			{
				title: 'music 1',
				state: 'pending'
			},
			{
				title: 'music 2',
				state: 'pending'
			},
			{
				title: 'music 3',
				state: 'pending'
			}
		]
	}

	setTimeout(() => {
		data.tracks[0].state = 'downloading'
	}, 0 * 1000)

	setTimeout(() => {
		data.tracks[0].state = 'ready'
		data.tracks[1].state = 'downloading'
	}, 2 * 1000)

	setTimeout(() => {
		data.tracks[1].state = 'ready'
		data.tracks[2].state = 'downloading'
	}, 4 * 1000)

	setTimeout(() => {
		data.tracks[2].state = 'ready'
	}, 5 * 1000)

	await (new Promise((res, rej) => {
			let rendered_lines = 0
			let interval = setInterval(() => {
				rendered_lines = render(data)
		
				if (data.tracks.every((t) => t.state == 'ready')) {
					clearInterval(interval)
					res()
				} else {
					readline.moveCursor(output, 0, -rendered_lines)
				}
			}, (1 * 1000))
		}))

	console.log('good bye')
}

//init()