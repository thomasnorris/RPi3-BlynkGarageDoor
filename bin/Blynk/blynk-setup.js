
var _outerFunc = module.exports = {
	Setup: function(callback) {
		var tcpPortUsed = require('tcp-port-used');
		var blynkLibrary = require('blynk-library');
		var blynkAuth = requireLocal('blynk-auth').GetAuth();

		// --These must match the hardware plain tcp/ip port and the ip of the server
		var blynkServerPort = 8442; //--8442 is the default
		var blynkServerIp = 'localhost';

		// --Blynk will only connect once the server is up and running
		tcpPortUsed.check(blynkServerPort, blynkServerIp).then((inUse) => {
			if (inUse) {
				_logger.Info.Async('Blynk server running', blynkServerIp + ':' + blynkServerPort);
				blynk = new blynkLibrary.Blynk(blynkAuth, options = {
					connector: new blynkLibrary.TcpClient(
						options = { addr: blynkServerIp, port: blynkServerPort })});

				// --Catch Blynk errors, log them, and then exit the process so PM2 will restart it
				blynk.on('error', (blynkErr) => {
					_logger.Error.Sync('Blynk error', blynkErr)
						.then(() => {
							process.exit(0);
						});
				});

				// --Small delay is necessary otherwise Blynk will error right away
				setTimeout(() => {
					callback(blynk);
				}, 500);
			}
			else
				_outerFunc.Setup(callback)
		});
	}
}