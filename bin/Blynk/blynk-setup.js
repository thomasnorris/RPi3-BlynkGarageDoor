
module.exports = function (callback) {
	// --These must match the hardware plain tcp/ip port and the ip of the server
	// --Change in SERVER_DIRECTORY/server.properties
	const BLYNK_SERVER_PORT = 8442;
	const BLYNK_SERVER_IP = 'localhost';

	const SERVER_DIRECTORY = __dirname + '/Server/';

	StartServer(SERVER_DIRECTORY, () => {
		var blynkLibrary = require('blynk-library');
		var blynkAuth = requireLocal('blynk-auth')();
		
		var blynk = new blynkLibrary.Blynk(blynkAuth, options = {
			connector: new blynkLibrary.TcpClient(
				options = { addr: BLYNK_SERVER_IP, port: BLYNK_SERVER_PORT })});

		blynk.on('error', (blynkErr) => {
			throw (blynkErr);
		});

		// --Small delay is necessary otherwise Blynk will error right away
		setTimeout(() => {
			callback(blynk);
		}, 500);
	});

	function StartServer(dir, callback) {
		var spawn = require('child_process').spawn;
		var fs = require('fs');

		// --Find the .jar file regardless of its name, avoids hardcoding the file name
		var results = [];
		var list = fs.readdirSync(dir);
		list.forEach((file) => {
			file = dir + '/' + file;
			results.push(file);
		});
		var serverFiles = results.filter((el) => {
			return el.match(/.+(\.jar)/);
		});

		if (serverFiles.length !== 1)
			throw ('Make sure only one server .jar is in ' + dir);

		var serverFile = serverFiles[0];

		// --Must temporarily cd into the server dir before spawn and cd back
		process.chdir(dir);
		var server = spawn('java', ['-jar', serverFile, '-dataFolder', dir, '-serverConfig', dir + 'server.properties']);
		process.chdir(__dirname);

		server.stdout.on('data', (data) => {
			data = data.toString();
			if (data.includes('started'))
				callback();
		});
	}
}
