
module.exports = function (callback) {
	var _dto = requireLocal('date-time-operations');
	var _fs = require('fs');
	var _blynkLibrary = require('blynk-library');
	var _blynkAuth = requireLocal('blynk-auth').GetAuth();

	var serverDirectory = __dirname + '/Server/';
	StartServer(serverDirectory, () => {
		// --These must match the hardware plain tcp/ip port and the ip of the server
		// --Change in serverDirectory/server.properties
		var blynkServerPort = 8442;
		var blynkServerIp = 'localhost';

		var blynk = new _blynkLibrary.Blynk(_blynkAuth, options = {
			connector: new _blynkLibrary.TcpClient(
				options = { addr: blynkServerIp, port: blynkServerPort })});

		// --Throw any blynk errors so PM2 can restart the program and server
		blynk.on('error', (blynkErr) => {
			throw (blynkErr);
		});

		// --Small delay is necessary otherwise Blynk will error right away
		setTimeout(() => {
			callback(blynk);
		}, 500);
	});

	// --Start the server by dynamically finding the correct server.jar file
	function StartServer(dir, callback) {
		var spawn = require('child_process').spawn;

		var results = [];
		var list = _fs.readdirSync(dir);
		list.forEach((file) => {
			file = dir + '/' + file;
			results.push(file);
		});
		var serverFile = results.filter((el) => {
			return el.match(/.+(\.jar)/);
		}).toString();

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
