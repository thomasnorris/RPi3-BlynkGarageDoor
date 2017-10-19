
var	blynkLibrary = require('blynk-library'),
	blynkAuth = require('./blynk-auth').getAuth(),
	_blynk = new blynkLibrary.Blynk(blynkAuth),
	_gpio = require('onoff').Gpio,
	_wol = require('wol');

var _vPinList = {
	v0Pin: new _blynk.VirtualPin(0),
	v1Pin: new _blynk.VirtualPin(1),
};

var _gpioList = {
	g4: new _gpio(4, 'high'),
};

var _constList = {
	LEVIATHAN_MAC: '70:8B:CD:4E:33:6A',
}

// -Main call
_blynk.on('connect', () => {
	blynkTriggerGpio(_vPinList['v0Pin'], _gpioList['g4']);
	blynkTriggerWol(_vPinList['v1Pin'], _constList['LEVIATHAN_MAC']);
});

function blynkTriggerGpio(trigger, gpio) {
	trigger.on('write', (value) => {
		value.toString() == 1 ? gpio.writeSync(0) : gpio.writeSync(1);
	});
}

function blynkTriggerWol(trigger, wolMac) {
	trigger.on('write', () => {
		_wol.wake(wolMac, () => {});
	});
}