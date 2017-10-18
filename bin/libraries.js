
module.exports = {
	getBlynk: () => {
		var blynkLibrary = require('blynk-library'),
			blynkAuth = require('./blynk-auth').getAuth();

		return new blynkLibrary.Blynk(blynkAuth);
	},
	getGpio: () => {
		return require('onoff').Gpio;
	},
	getWol: () => {
		return require('wol');
	}
}

