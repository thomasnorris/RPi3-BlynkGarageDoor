
var libraries = require('./libraries'),
	blynk = libraries.getBlynk(),
	gpio = libraries.getGpio();

var vPinList = [],
	// v_Led = new blynk.WidgetLed(_), // reference for later on
	v0Pin = new blynk.VirtualPin(0), // master enable pin
	v1Pin = new blynk.VirtualPin(1),
	v2Pin = new blynk.VirtualPin(2), 
	v3Pin = new blynk.VirtualPin(3);

var gpioList = [],
	g4 = new gpio(4, 'high'),
	g17 = new gpio(17, 'high'),
	g27 = new gpio(27, 'high');

var masterEnable = true;

vPinList.push(v1Pin, v2Pin, v3Pin); // no enable pin
gpioList.push(g4, g17, g27); // no input gpio pins (not implemented now)

// Execute funcions
blynk.on('connect', () => {
	blynkTriggerGpio(v1Pin, g4);
	blynkTriggerGpio(v2Pin, g17);
	blynkTriggerGpio(v3Pin, g27);
	setupEnableSwitch(v0Pin);
	finishUp();
});

function blynkTriggerGpio(trigger, gpio) {
	trigger.on('write', (value) => {
		if (masterEnable)
			value.toString() == 1 ? gpio.writeSync(0) : gpio.writeSync(1);
		else
			trigger.write(0);
	});
}

function resetEverything() {
	gpioList.forEach((gpio) => {
		gpio.writeSync(1);
	});
	vPinList.forEach((vPin) => {
		vPin.write(0);
	});
}

function setupEnableSwitch(enable) {
	enable.write(0);
	enable.on('write', (value) => {
		resetEverything();
		value == 1 ? masterEnable = true : masterEnable = false;
	});
}

function finishUp() {
	
}
