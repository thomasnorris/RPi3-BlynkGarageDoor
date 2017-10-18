
var libraries = require('./libraries'),
	blynk = libraries.getBlynk(),
	gpio = libraries.getGpio();

var vPinList = [],
	v0Pin = new blynk.VirtualPin(0), // master enable pin
	v1Pin = new blynk.VirtualPin(1),
	v2Pin = new blynk.VirtualPin(2), 
	v3Pin = new blynk.VirtualPin(3);

var vLedList = [],
	v4Led = new blynk.WidgetLED(4),
	v5Led = new blynk.WidgetLED(5),
	v6Led = new blynk.WidgetLED(6)

var gpioList = [],
	g4 = new gpio(4, 'high'),
	g17 = new gpio(17, 'high'),
	g27 = new gpio(27, 'high');

var masterEnable = false;

vPinList.push(v1Pin, v2Pin, v3Pin); // no enable pin
gpioList.push(g4, g17, g27); // no input gpio pins (not implemented now)

// Execute funcions
blynk.on('connect', () => {
	blynkTriggerGpio(v1Pin, g4, v4Led);
	blynkTriggerGpio(v2Pin, g17, v5Led);
	blynkTriggerGpio(v3Pin, g27, v6Led);
	setupEnableSwitch(v0Pin);
});

function blynkTriggerGpio(trigger, gpio, vLed) {
	trigger.on('write', (value) => {
		if (masterEnable)
			value.toString() == 1 ? gpio.writeSync(0) : gpio.writeSync(1);
		else
			trigger.write(0);
	});
	setInterval(() => {
			gpio.readSync() == 1 ? vLed.turnOff() : vLed.turnOn();
	}, 250);
}

function resetEverything() {
	gpioList.forEach((gpio) => {
		gpio.writeSync(1);
	});
	vPinList.forEach((vPin) => {
		vPin.write(0);
	});
	vLedList.forEach((vLed) => {
		vLed.turnOff();
	});
}

function setupEnableSwitch(enable) {
	enable.write(masterEnable ? 1 : 0);
	enable.on('write', (value) => {
		resetEverything();
		value == 1 ? masterEnable = true : masterEnable = false;
	});
}
