
var libraries = require('./libraries'),
	blynk = libraries.getBlynk(),
	gpio = libraries.getGpio(),
	wol = libraries.getWol();

var vPinList = [],
	v0Pin = new blynk.VirtualPin(0),
	v1Pin = new blynk.VirtualPin(1);

var gpioList = [],
	g4 = new gpio(4, 'high'); // -Must be set to 'high' for the relay board

vPinList.push(v0Pin, v1Pin); // -No enable pin
gpioList.push(g4); // -No input gpio pins (not implemented now)

var LEVIATHAN_MAC = "70:8B:CD:4E:33:6A";

blynk.on('connect', () => {
	blynkTriggerGpio(v0Pin, g4);
	blynkTriggerWol(v1Pin, LEVIATHAN_MAC);
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