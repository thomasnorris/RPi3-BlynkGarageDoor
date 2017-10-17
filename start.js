
// starts main.js as a child process and exits

require('child_process').fork(__dirname + '/main.js');

setTimeout(() => {
	process.exit(0);
}, 5000);