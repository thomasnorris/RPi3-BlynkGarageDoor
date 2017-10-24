
var	blynkLibrary = require('blynk-library'),
	blynkAuth = require('./blynk-auth').getAuth(),
	_blynk = new blynkLibrary.Blynk(blynkAuth);
	_gpio = require('onoff').Gpio,
	_schedule = require('node-schedule'),
	_dbo = require('./database-operations');

var	_vPinArr = [],
	_manualOverride = new _blynk.VirtualPin(0), 
	_manualColumbia = new _blynk.VirtualPin(1), 
	_manualWell = new _blynk.VirtualPin(2);
	_wellRechargeLevel = new _blynk.VirtualPin(3), 
	_wellRechargeCounter = new _blynk.VirtualPin(4),
	_columbiaLifetimeTimer = new _blynk.VirtualPin(5),
	_usingColumbiaLed = new _blynk.WidgetLED(6),
	_wellLifetimeTimer = new _blynk.VirtualPin(7),
	_usingWellLed = new _blynk.WidgetLED(8),
	_callForHeatCounter = new _blynk.VirtualPin(9),
	_callForHeatLed = new _blynk.WidgetLED(10),
	_boilerCallForGasLed = new _blynk.WidgetLED(11); 
_vPinArr.push(_manualOverride, _manualWell, _manualColumbia);

var _gpioArr = [],
	_wellRechargeInput = new _gpio(26, 'in', 'both'),
	_g4 = new _gpio(4, 'high');
_gpioArr.push(_g4); // -no input gpio

const RECHARGE_TIME_MINUTES = 5;
const RECHARGE_COUNTUP_MILI = 1000;
const CRON_LOG_SCHEDULE = '00 07,19 * * *';
const CRON_REBOOT_SCHEDULE = '00 00 * * *';

var _mapping = {
	0: 'Date',
	1: 'Recharge Counter',
	2: 'Columbia Timer',
	3: 'Well Timer',
	4: 'Call For Heat Counter'
}

// -maps to the _mapping object above by index
var _newData = [];

_blynk.on('connect', () => {
	_dbo.LoadDatabase(_mapping, (recentData) => {
		_newData = recentData;
		InitializeValues();
		BlynkTriggerGpio(_manualColumbia, _g4);
		StartWellRehargeMonitoring();
		StartSchedules();
	});
});

function StartSchedules() {
	_schedule.scheduleJob(CRON_LOG_SCHEDULE, () => {
    	_dbo.AddToDatabase(_newData);
	});
	_schedule.scheduleJob(CRON_REBOOT_SCHEDULE, () => {
		require('child_process').exec('sudo reboot');
	});
}

function InitializeValues() {
	_wellRechargeCounter.write(_newData[1]);
	_columbiaLifetimeTimer.write(_newData[2]);
	_wellLifetimeTimer.write(_newData[3]);
	_callForHeatCounter.write(_newData[4]);
	_gpioArr.forEach((gpio) => {
		gpio.writeSync(1);
	});
	_vPinArr.forEach((vPin) => {
		vPin.write(0);
	});
}

function StartWellRehargeMonitoring() {
	var interval;
	_wellRechargeInput.watch((err, value) => {
		if (err) throw err;
		if (value.toString() == 1) {
			var i = 0;
			interval = setInterval(() => {
				i++;
				if (i == RECHARGE_TIME_MINUTES + 1) {
					_wellRechargeCounter.write(++_newData[1]);
					clearInterval(interval);
				}
				else
					_wellRechargeLevel.write(i);
			}, RECHARGE_COUNTUP_MILI);
		} else {
			_wellRechargeLevel.write(0);
			clearInterval(interval);
		}
	});
}

function BlynkTriggerGpio(trigger, gpio) {
	trigger.on('write', (value) => {
		value.toString() == 1 ? gpio.writeSync(0) : gpio.writeSync(1);
	});
}