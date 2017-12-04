
var _outerFunc = module.exports = {
	Setup: function(callback) {
		var _fs = require('fs');
		var _logName = 'blynk-errors.txt'
		var _tcpPortUsed = require('tcp-port-used');
		var _blynkLibrary = require('blynk-library');
		//var _blynkAuth = require('./blynk-auth').GetAuth();
		var _blynkAuth = ''

		// --These must match the hardware plain tcp/ip port and the ip of the server
		var blynkServerPort = 8442; //--8442 is the default
		var blynkServerIp = 'localhost';

		// --Blynk will only connect once the server is up and running
		(function CheckForServerAndSetupBlynk() {
			_tcpPortUsed.check(blynkServerPort, blynkServerIp).then((inUse) => {
				if (!inUse)
					CheckForServerAndSetupBlynk();
				else {
					blynk = new _blynkLibrary.Blynk(_blynkAuth, options = {
						connector: new _blynkLibrary.TcpClient(
							options = { addr: blynkServerIp, port: blynkServerPort })});

					blynk.on('error', (err) => {
						_fs.stat(_logName, (err, stats) => {
							if (!stats || stats.size === 0)
								_fs.closeSync(_fs.openSync(_logName, 'w'));

							var stream = _fs.createWriteStream(_logName, { flags: 'a' });
							stream.write(blynkErr);
							stream.end('\n')
						})
					});

					// --Small delay is necessary otherwise Blynk will error right away
					setTimeout(() => {
						callback(blynk);
					}, 500);
				}
			});
		})();
	}
}