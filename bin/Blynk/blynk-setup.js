
var _outerFunc = module.exports = {
	Setup: function(callback) {
		var _dto = requireLocal('date-time-operations');
		var _fs = require('fs');
		var _tcpPortUsed = require('tcp-port-used');
		var _blynkLibrary = require('blynk-library');
		var _blynkAuth = requireLocal('blynk-auth').GetAuth();

		var serverDirectory = __dirname + '/Server/';

		StartServer(serverDirectory, () => {
			var blynkErrorLogNameWithPath = __dirname + '/blynk-errors.txt';
			// --These must match the hardware plain tcp/ip port and the ip of the server
			var blynkServerPort = 8442; //--8442 is the default
			var blynkServerIp = 'localhost';
			
			blynk = new _blynkLibrary.Blynk(_blynkAuth, options = {
				connector: new _blynkLibrary.TcpClient(
					options = { addr: blynkServerIp, port: blynkServerPort })});

			// --Catch Blynk errors and log them to a file. PM2 will take care of other issues
			blynk.on('error', (blynkErr) => {
				_fs.stat(blynkErrorLogNameWithPath, (err, stats) => {
					if (!stats || stats.size === 0)
						_fs.closeSync(_fs.openSync(blynkErrorLogNameWithPath, 'w'));

					var stream = _fs.createWriteStream(blynkErrorLogNameWithPath, { flags: 'a' });
					stream.write(_dto.GetCurrentDateAndTime() + ': ' + blynkErr);
					stream.end('\n');
				});
			});

			// --Small delay is necessary otherwise Blynk will error right away
			setTimeout(() => {
				callback(blynk);
			}, 500);
		});

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

			spawn('java', ['-jar', serverFile, '-dataFolder', dir]);
			callback();
		}
	}
}