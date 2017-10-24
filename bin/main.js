
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
	_columbiaTimer = new _blynk.VirtualPin(5),
	_usingColumbiaLed = new _blynk.WidgetLED(6),
	_wellTimer = new _blynk.VirtualPin(7),
	_usingWellLed = new _blynk.WidgetLED(8),
	_cfhCounter = new _blynk.VirtualPin(9),
	_cfhLed = new _blynk.WidgetLED(10),
	_boilerCallForGasLed = new _blynk.WidgetLED(11); 
_vPinArr.push(_manualOverride, _manualWell, _manualColumbia, _wellRechargeLevel);

var _gpioArr = [],
	_wellRechargeInput = new _gpio(26, 'in', 'both'),
	_g4 = new _gpio(4, 'high');
_gpioArr.push(_g4); // -no input gpio

const RECHARGE_TIME_MINUTES = 5;
const RECHARGE_COUNTUP_MILI = 1000;
const CRON_CSV_WRITE_SCHEDULE = '0 7,19 * * *';
const CRON_ARCHIVE_SCHEDULE = '0 0 * */1 *';

var _mapping = {
	DATE: 'Date',
	WELL_RECHARGE_COUNTER: 'Recharge Counter',
	COLUMBIA_TIMER: 'Columbia Timer',
	WELL_TIMER: 'Well Timer',
	CFH_COUNTER : 'Call For Heat Counter'
}

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
	_schedule.scheduleJob(CRON_CSV_WRITE_SCHEDULE, () => {
    	_dbo.WriteToCsv();
	});
	_schedule.scheduleJob(CRON_ARCHIVE_SCHEDULE, () => {
		_dbo.CreateArchives(_mapping);
	});
}

function InitializeValues() {
	_wellRechargeCounter.write(_newData[_mapping.WELL_RECHARGE_COUNTER]);
	_columbiaTimer.write(_newData[_mapping.COLUMBIA_TIMER]);
	_wellTimer.write(_newData[_mapping.WELL_TIMER]);
	_cfhCounter.write(_newData[_mapping.CFH_COUNTER]);

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
		clearInterval(interval);
		if (value.toString() == 1) {
			var i = 0;
			interval = setInterval(() => {
				++i;
				if (i == RECHARGE_TIME_MINUTES + 1) {
					_wellRechargeCounter.write(++_newData[_mapping.WELL_RECHARGE_COUNTER]);
					_dbo.AddToDatabase(_newData);
					clearInterval(interval);
				}
				else
					_wellRechargeLevel.write(i);
			}, RECHARGE_COUNTUP_MILI);
		} else 
			_wellRechargeLevel.write(0);
	});
}

function BlynkTriggerGpio(trigger, gpio) {
	trigger.on('write', (value) => {
		value.toString() == 1 ? gpio.writeSync(0) : gpio.writeSync(1);
	});
}