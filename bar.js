exports.bar = () => {
	console.log('bar');
}

function foo() {
	console.log(bar())
}

if (module === require.main ) {
	this.bar()
}