
var libraries = require('./libraries'),
	blynk = libraries.getBlynk(),
	gpio = libraries.getGpio(),
	wol = libraries.getWol();

var vPinList = {
	v0Pin: new blynk.VirtualPin(0),
	v1Pin: new blynk.VirtualPin(1),
};

var gpioList = {
	g4: new gpio(4, 'high'),
};

var constList = {
	LEVIATHAN_MAC: '70:8B:CD:4E:33:6A',
}

// -Main call
blynk.on('connect', () => {
	blynkTriggerGpio(vPinList['v0Pin'], gpioList['g4']);
	blynkTriggerWol(vPinList['v1Pin'], constList['LEVIATHAN_MAC']);
});

function blynkTriggerGpio(trigger, gpio) {
	trigger.on('write', (value) => {
		value.toString() == 1 ? gpio.writeSync(0) : gpio.writeSync(1);
	});
}

function blynkTriggerWol(trigger, wolMac) {
	trigger.on('write', () => {
		wol.wake(LEVIATHAN_MAC, () => {});
	});
}