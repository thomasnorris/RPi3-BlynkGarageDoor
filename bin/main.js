
var	blynkLibrary = require('blynk-library'),
	blynkAuth = require('./blynk-auth').getAuth(),
	_blynk = new blynkLibrary.Blynk(blynkAuth),
	_gpio = require('onoff').Gpio,
	_schedule = require('node-scheduler'),
	_dbo = require('./database-operations');

var	_manualOverride = new _blynk.VirtualPin(0), 
	_manualColumbia = new _blynk.VirtualPin(1), 
	_manualWell = new _blynk.VirtualPin(2), 
	_wellRechargeLevel = new _blynk.VirtualPin(3), 
	_wellRechargeCounter = new _blynk.VirtualPin(4),
	_columbiaLifetimeTimer = new _blynk.VirtualPin(5),
	_usingColumbiaLed = new _blynk.WidgetLED(6),
	_wellLifetimeTimer = new _blynk.VirtualPin(7),
	_usingWellLed = new _blynk.WidgetLED(8),
	_callForHeatCounter = new _blynk.VirtualPin(9),
	_callForHeatLed = new _blynk.WidgetLED(10),
	_boilerCallForGasLed = new _blynk.WidgetLED(11); 

var _gpioList = [],
	_g4 = new _gpio(4, 'high');
_gpioList.push(_g4);

const RECHARGE_TIME_MINUTES = 90;
const RECHARGE_COUNTUP_MILI = 1000;
const CRON_LOG_SCHEDULE = '0 0 7,19 * * *';

var _mapping = {
	0: 'Date',
	1: 'Recharge Timer',
	2: 'Columbia Timer',
	3: 'Well Timer',
	4: 'Call For Heat Counter'
}

// -maps to the _mapping object above by index
var _newData = [];

_blynk.on('connect', () => {
	_dbo.LoadDatabase(_mapping, (recentData) => {
		_newData = recentData;
		//_newData[1] = 'something';
		//_newData[2] = 'read a pin value'
		//_newData[3] = 'get the idea?'
		ResetAllGpio();
		BlynkTriggerGpio(_manualColumbia, _g4);
		CountUp(_manualWell, _wellRechargeLevel, _wellRechargeCounter);
		StartLoggingJob();
	});
});

function StartLoggingJob() {
	_schedule.scheduleJob(CRON_LOG_SCHEDULE, () => {
    	_dbo.AddToDatabase(_newData);
	});
}

function ResetAllGpio() {
	_gpioList.forEach((gpio) => {
		gpio.writeSync(1);
	});
}

function CountUp(trigger, display, counter) {
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

function BlynkTriggerGpio(trigger, gpio) {
	trigger.on('write', (value) => {
		value.toString() == 1 ? gpio.writeSync(0) : gpio.writeSync(1);
	});
}
