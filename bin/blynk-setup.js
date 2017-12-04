
var _outerFunc = module.exports = {
	Setup: function(callback) {
		var tcpPortUsed = require('tcp-port-used');
		var blynkLibrary = require('blynk-library');
		//var blynkAuth = require('./blynk-auth').GetAuth();
		var blynkAuth = ''

		// --These must match the hardware plain tcp/ip port and the ip of the server
		var blynkServerPort = 8442; //--8442 is the default
		var blynkServerIp = 'localhost';

		CheckForServerAndSetupBlynk();

		// --Blynk will only connect once the server is up and running
		function CheckForServerAndSetupBlynk() {
			tcpPortUsed.check(blynkServerPort, blynkServerIp).then((inUse) => {
				if (!inUse)
					CheckForServerAndSetupBlynk();
				else {
					blynk = new blynkLibrary.Blynk(blynkAuth, options = {
						connector: new blynkLibrary.TcpClient(
							options = { addr: blynkServerIp, port: blynkServerPort })});

					blynk.on('error', (err) => {
						// --Handle the error but don't do anything with it right now
					});

					// --Small delay is necessary otherwise Blynk will error right away
					setTimeout(() => {
						callback(blynk);
					}, 500);
				}
			})
		}
	}
}