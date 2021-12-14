async function get_access_token() {
	let access_token

	const server = new Promise((resolve, reject) => {
		const app = new express()

		app.get('/auth', async (req, res) => {
			console.log('resived code')

			const { code, state, error } = req.params

			if (error) {
				reject(error)
			}

			resolve({ code, state })
			res.end()
		})

		app.listen(4040, () => {
			console.log('server listing to port 4040')
		})
	})

	return access_token
}