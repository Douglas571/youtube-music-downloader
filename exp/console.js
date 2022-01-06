const readline = require('readline')

async function render(data) {
	readline.clearScreenDown(output)

	let c = 0
	for (let key in data) {
		c++
		output.write(`${key}: ${data[key]}\n`)		
	}

	readline.moveCursor(output, 0, -c)
}

async function init() {

	const { stdin: input, stdout: output } = require('process');
	//let rl = readline.createInterface({ input, output })

	let data = {
		'a': 'pending',
		'b': 'pending',
		'c': 'pending',
	}

	await (new Promise((res, rej) => {
			let interval = setInterval(() => {
				render(data)
		
				if (data['c'] == 'ready') {
					clearInterval(interval)
					res()
				}
			}, (1 * 1000))
		})

	console.log('here')
	
}

init()