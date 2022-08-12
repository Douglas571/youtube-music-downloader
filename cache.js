const path = require('path')
class Cache {
	constructor(op) {
		this.path = op.cache_path || path.join(__dirname, 'temp')
	}

	get()
}

module.exports = Cache