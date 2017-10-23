
var	blynkLibrary = require('blynk-library'),
	blynkAuth = require('./blynk-auth').getAuth(),
	_blynk = new blynkLibrary.Blynk(blynkAuth),
	_gpio = require('onoff').Gpio;

var	_manualOverride = new _blynk.VirtualPin(0), 
	_manualColumbia = new _blynk.VirtualPin(1), 
	_manualWell = new _blynk.VirtualPin(2), 
	_wellRechargeLevel = new _blynk.VirtualPin(3), 
	_wellRechargeCounter = new _blynk.VirtualPin(4),
	_columbiaLifetimeTimer = new _blynk.VirtualPin(5),
	_usingColumbiaLed = new _blynk.WidgetLED(6),
	_wellLifetimeTimer = new _blynk.VirtualPin(7),
	_usingWellLed = new _blynk.VirtualPin(8),
	_callForHeatCounter = new _blynk.VirtualPin(9),
	_callForHeatLed = new _blynk.WidgetLED(10),
	_boilerCallForGasLed = new _blynk.WidgetLED(11); 

var _gpioList = [],
	_g4 = new _gpio(4, 'high');
_gpioList.push(_g4);

const RECHARGE_TIME_MINUTES = 90;
const RECHARGE_COUNTUP_MILI = 1000;

_blynk.on('connect', () => {
	ResetAllGpio();
	blynkTriggerGpio(_manualOverride, _g4);
	countUp(_manualWell, _wellRechargeLevel, _wellRechargeCounter);
});

function ResetAllGpio() {
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
					//counter.write();
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
