
var _outerFunc = module.exports = {
	Setup: function(callback) {
		var dto = requireLocal('date-time-operations');
		var fs = require('fs');
		var tcpPortUsed = require('tcp-port-used');
		var blynkLibrary = require('blynk-library');
		var blynkAuth = requireLocal('blynk-auth').GetAuth();

		var blynkErrorLogNameWithPath = __dirname + '/blynk-errors.txt';

		// --These must match the hardware plain tcp/ip port and the ip of the server
		var blynkServerPort = 8442; //--8442 is the default
		var blynkServerIp = 'localhost';

		// --Blynk will only connect once the server is up and running
		tcpPortUsed.check(blynkServerPort, blynkServerIp).then((inUse) => {
			if (inUse) {
				blynk = new blynkLibrary.Blynk(blynkAuth, options = {
					connector: new blynkLibrary.TcpClient(
						options = { addr: blynkServerIp, port: blynkServerPort })});

				// --Catch Blynk errors and log them to a file. PM2 will take care of other issues
				blynk.on('error', (blynkErr) => {
					fs.stat(blynkErrorLogNameWithPath, (err, stats) => {
						if (!stats || stats.size === 0)
							fs.closeSync(fs.openSync(blynkErrorLogNameWithPath, 'w'));

						var stream = fs.createWriteStream(blynkErrorLogNameWithPath, { flags: 'a' });
						stream.write(dto.GetCurrentDateAndTime() + ': ' + blynkErr);
						stream.end('\n');

						// --Throw the Blynk error so PM2 will restart
						stream.on('finish', () => {
							throw blynkErr;
						});
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