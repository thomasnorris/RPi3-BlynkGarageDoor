
var	blynkLibrary = require('blynk-library'),
	blynkAuth = require('./blynk-auth').getAuth(),
	_blynk = new blynkLibrary.Blynk(blynkAuth),
	_gpio = require('onoff').Gpio,
	_schedule = require('node-schedule'),
	_dbo = require('./database-operations'),
	_dto = require('./date-time-operations');

var	_vPinArr = [],
	_vLedArr = [],
	_manualOverrideButton = new _blynk.VirtualPin(0), 
	_manualColumbiaButton = new _blynk.VirtualPin(1), 
	_manualWellButton = new _blynk.VirtualPin(2),
	_wellRechargeLevelDisplay = new _blynk.VirtualPin(3), 
	_wellRechargeCounterDisplay = new _blynk.VirtualPin(4),
	_columbiaTimerDisplay = new _blynk.VirtualPin(5),
	_usingColumbiaLed = new _blynk.WidgetLED(6),
	_wellTimerDisplay = new _blynk.VirtualPin(7),
	_usingWellLed = new _blynk.WidgetLED(8),
	_cfhCounterDisplay = new _blynk.VirtualPin(9),
	_cfhLed = new _blynk.WidgetLED(10),
	_boilerCfgLed = new _blynk.WidgetLED(11);
_vPinArr.push(_manualOverrideButton, _manualWellButton, _manualColumbiaButton, _wellRechargeLevelDisplay); // --No vPins from _mapping
_vLedArr.push(_usingColumbiaLed, _usingWellLed, _cfhLed, _boilerCfgLed); // --All leds

var _gpioArr = [],
	_wellRechargeInput = new _gpio(26, 'in', 'both'),
	_boilerCfgInput = new _gpio(13, 'in', 'both'),
	_cfhInput = new _gpio(6, 'in', 'both'),
	_columbiaValveRelayOutput = new _gpio(4, 'high'),
	_wellValveRelayOutput = new _gpio(17, 'high'),
	_boilerStartRelayOutput = new _gpio(27, 'high');
_gpioArr.push(_columbiaValveRelayOutput, _wellValveRelayOutput, _boilerStartRelayOutput); // --No input gpio

const RECHARGE_TIME_MINUTES = 5;
const RECHARGE_INTERVAL_MILLI = 1000;
const TIMER_INTERVAL_MILLI = 10000;
const CRON_CSV_WRITE_SCHEDULE = '0 7,19 * * *';
const CRON_ARCHIVE_SCHEDULE = '0 0 * */1 *';

var _mapping = {
	DATE: 'Date',
	WELL_RECHARGE_COUNTER: 'Recharge Counter',
	COLUMBIA_TIMER: 'Columbia Timer',
	WELL_TIMER: 'Well Timer',
	CFH_COUNTER : 'Call For Heat Counter'
}

var _newData;

_blynk.on('connect', () => {
	_dbo.LoadDatabase(_mapping, (recentData) => {
		_newData = recentData;
		InitializeValues();
		BlynkTriggerGpio(_manualColumbiaButton, _columbiaValveRelayOutput);
		BlynkTriggerGpio(_manualWellButton, _wellValveRelayOutput);
		StartInputMonitoring();
		StartSchedules();
	});
});

function StartInputMonitoring() {
	var isCfh = false;
	var isBoilerCfg = false;
	var isWellCharged = false;

	var wellRechargeInterval;
	var chargeInProgress = false;
	_wellRechargeInput.watch((err, value) => {
		clearInterval(wellRechargeInterval);
		if (value.toString() == 1 && !chargeInProgress) {
			_wellRechargeLevelDisplay.write(0);
			chargeInProgress = true;
			isWellCharged = false;
			var i = 1;
			wellRechargeInterval = setInterval(() => {
				_wellRechargeLevelDisplay.write(i);
				if (i == RECHARGE_TIME_MINUTES) {
					_wellRechargeCounterDisplay.write(++_newData[_mapping.WELL_RECHARGE_COUNTER]);
					_dbo.AddToDatabase(_newData);
					chargeInProgress = false;
					isWellCharged = true;
					clearInterval(wellRechargeInterval);
				} else 
					i++;
			}, RECHARGE_INTERVAL_MILLI);
		}
	});
	_cfhInput.watch((err, value) => {
		if (value.toString() == 1) {
			_cfhCounterDisplay.write(++_newData[_mapping.CFH_COUNTER]);
			_cfhLed.turnOn();
			isCfh = true;
			_boilerStartRelayOutput.writeSync(0);
		} else {
			_cfhLed.turnOff();
			isCfh = false;
			_boilerStartRelayOutput.writeSync(1);
		} 
	});
	_boilerCfgInput.watch((err, value) => {
		while (value.toString() == 1) {
			_boilerCfgLed.turnOn();
			isBoilerCfg = true;
			if (isWellCharged) {
				_wellValveRelayOutput.writeSync(0);
				_columbiaValveRelayOutput.writeSync(1);
			} else {
				_columbiaValveRelayOutput.writeSync(0);
				_wellValveRelayOutput.writeSync(1);
			}
		} 
		_boilerCfgLed.turnOff();
		isBoilerCfg = false;
		_columbiaValveRelayOutput.writeSync(1);
		_wellValveRelayOutput.writeSync(1);
	});

	var timerRunning = false;
	var wellInterval;
	var columbiaInterval;

	while (isCfh && isBoilerCfg) {
		if (!timerRunning) {
			if (isWellCharged) {
				clearInterval(columbiaInterval);
				wellInterval = RunTimer(_wellTimerDisplay, _newData[_mapping.WELL_TIMER]);
			} else {
				clearInterval(wellInterval);
				columbiaInterval = RunTimer(_columbiaTimerDisplay, _newData[_mapping.COLUMBIA_TIMER]);
			}
		}
	}

	while (!isCfh || !isBoilerCfg) {
		timerRunning = false;
	}

	function RunTimer(blynkDisplay, dataToUpdate) {
		timerRunning = true;
		return setInterval(() => {
			blynkDisplay.write(_dto.MinutesAsHoursMins(++dataToUpdate));
			_dbo.AddToDatabase(_newData);
		}, TIMER_INTERVAL_MILLI);
	}
}

function StartSchedules() {
	_schedule.scheduleJob(CRON_CSV_WRITE_SCHEDULE, () => {
    	_dbo.WriteToCsv();
	});
	_schedule.scheduleJob(CRON_ARCHIVE_SCHEDULE, () => {
		_dbo.CreateArchives();
	});
}

function InitializeValues() {
	_wellRechargeCounterDisplay.write(_newData[_mapping.WELL_RECHARGE_COUNTER]);
	_columbiaTimerDisplay.write(_dto.MinutesAsHoursMins(_newData[_mapping.COLUMBIA_TIMER]));
	_wellTimerDisplay.write(_dto.MinutesAsHoursMins(_newData[_mapping.WELL_TIMER]));
	_cfhCounterDisplay.write(_newData[_mapping.CFH_COUNTER]);

	_gpioArr.forEach((gpio) => {
		gpio.writeSync(1);
	});
	_vPinArr.forEach((vPin) => {
		vPin.write(0);
	});
	_vLedArr.forEach((vLed) => {
		vLed.turnOff();
	});
}

function BlynkTriggerGpio(trigger, gpio) {
	trigger.on('write', (value) => {
		value.toString() == 1 ? gpio.writeSync(0) : gpio.writeSync(1);
	});
}