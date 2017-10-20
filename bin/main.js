
var	blynkLibrary = require('blynk-library'),
	blynkAuth = require('./blynk-auth').getAuth(),
	_blynk = new blynkLibrary.Blynk(blynkAuth),
	_gpio = require('onoff').Gpio,
	_wol = require('wol');

var _vPinList = [],
	_v0Pin = new _blynk.VirtualPin(0), // -Columbia valve
	_v1Pin = new _blynk.VirtualPin(1), // -Wake Leviathan
	_v2Pin = new _blynk.VirtualPin(2), // -Well valve
	_v3Pin = new _blynk.VirtualPin(3), // -Recharge level
	_v4Pin = new _blynk.VirtualPin(4); // -Recharge counter
_vPinList.push(_v0Pin, _v1Pin, _v2Pin, _v3Pin, _v4Pin)

var _gpioList = [],
	_g4 = new _gpio(4, 'high');
_gpioList.push(_g4);

const LEVIATHAN_MAC = '70:8B:CD:4E:33:6A';
const RECHARGE_TIME_MINUTES = 90;
const RECHARGE_COUNTUP_MILI = 1000;

var _rechargeCounter = 1;

// -Main call
_blynk.on('connect', () => {
	initialize();
	blynkTriggerGpio(_v0Pin, _g4);
	blynkTriggerWol(_v1Pin, LEVIATHAN_MAC);
	countUp(_v2Pin, _v3Pin, _v4Pin);
});

function initialize() {
	_vPinList.forEach((vPin) => {
		vPin.write(0);
	});
	_gpioList.forEach((gpio) => {
		gpio.writeSync(1);
	});
}

function countUp(trigger, display, counter) {
	var interval;
	trigger.on('write', (value) => {
		if (value.toString() == 1) {
			var i = 0;
			interval = setInterval(() => {
				i++;
				if (i == RECHARGE_TIME_MINUTES + 1) {
					counter.write(_rechargeCounter++);
					clearInterval(interval);
				}
				else
					display.write(i);
			}, RECHARGE_COUNTUP_MILI);
		} else {
			display.write(0);
			clearInterval(interval);
		}
	});
}

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
