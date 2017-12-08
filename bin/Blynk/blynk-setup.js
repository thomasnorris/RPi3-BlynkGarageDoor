
module.exports = function (callback) {
	var _dto = requireLocal('date-time-operations');
	var _fs = require('fs');
	var _blynkLibrary = require('blynk-library');
	var _blynkAuth = requireLocal('blynk-auth').GetAuth();

	const SERVER_DIRECTORY = __dirname + '/Server/';
	StartServer(SERVER_DIRECTORY, () => {
		// --These must match the hardware plain tcp/ip port and the ip of the server
		// --Change in SERVER_DIRECTORY/server.properties
		const BLYNK_SERVER_PORT = 8442;
		const BLYNK_SERVER_IP = 'localhost';

		var blynk = new _blynkLibrary.Blynk(_blynkAuth, options = {
			connector: new _blynkLibrary.TcpClient(
				options = { addr: BLYNK_SERVER_IP, port: BLYNK_SERVER_PORT })});

		// --Throw any blynk errors so PM2 can restart everything
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

		// --Find the .jar file regardless of its name, avoids hardcoding the file name
		var results = [];
		var list = _fs.readdirSync(dir);
		list.forEach((file) => {
			file = dir + '/' + file;
			results.push(file);
		});
		var serverFiles = results.filter((el) => {
			return el.match(/.+(\.jar)/);
		});

		// --If no or more than one .jar is found, throw this, because we only need one
		if (serverFiles.length !== 1)
			throw ('Make sure only one server .jar is in ' + dir);

		var serverFile = serverFiles[0];

		// --Must temporarily cd into the server dir before spawn and cd back
		process.chdir(dir);
		var server = spawn('java', ['-jar', serverFile, '-dataFolder', dir, '-serverConfig', dir + 'server.properties']);
		process.chdir(__dirname);

		server.stdout.on('data', (data) => {
			data = data.toString();
			// --Callback only when the server has actually started
			if (data.includes('started'))
				callback();
		});
	}
}
