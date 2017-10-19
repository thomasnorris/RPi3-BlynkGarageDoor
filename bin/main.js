
var libraries = require('./libraries'),
	_blynk = libraries.getBlynk(),
	_gpio = libraries.getGpio(),
	_wol = libraries.getWol();

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
blynk.on('connect', () => {
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
		_wol.wake(LEVIATHAN_MAC, () => {});
	});
}