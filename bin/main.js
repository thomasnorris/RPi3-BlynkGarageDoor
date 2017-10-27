
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
	_ecobeeCfhCounterDisplay = new _blynk.VirtualPin(9),
	_ecobeeCfhLed = new _blynk.WidgetLED(10),
	_boilerCfgLed = new _blynk.WidgetLED(11);
_vPinArr.push(_manualOverrideButton, _manualWellButton, _manualColumbiaButton, _wellRechargeLevelDisplay); // --No vPins from _mapping
_vLedArr.push(_usingColumbiaLed, _usingWellLed, _ecobeeCfhLed, _boilerCfgLed); // --All leds

var _gpioArr = [],
	_wellPressureSwitchInput = new _gpio(26, 'in', 'both'),
	_boilerCfgInput = new _gpio(13, 'in', 'both'),
	_ecobeeCfhInput = new _gpio(16, 'in', 'both'),
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
	var isEcobeeCfh = false;
	var isBoilerCfg = false;
	var isWellCharged = false;

	var wellRechargeInterval;
	var chargeInProgress = false;
	_wellPressureSwitchInput.watch((err, value) => {
		if (value.toString() == 1 && !chargeInProgress) {
			_wellRechargeLevelDisplay.write(0);
			chargeInProgress = true;
			isWellCharged = false;

			var i = 0;
			RechargeLoop();
			wellRechargeInterval = setInterval(RechargeLoop, RECHARGE_INTERVAL_MILLI);
		}

		function RechargeLoop() {
			if (i != RECHARGE_TIME_MINUTES)
				_wellRechargeLevelDisplay.write(++i);
			else {
				_wellRechargeCounterDisplay.write(++_newData[_mapping.WELL_RECHARGE_COUNTER]);
				_dbo.AddToDatabase(_newData);
				isWellCharged = true;
				chargeInProgress = false;
				clearInterval(wellRechargeInterval);
			} 
		}
	});

	_ecobeeCfhInput.watch((err, value) => {
		if (value.toString() == 1) {
			_ecobeeCfhCounterDisplay.write(++_newData[_mapping.CFH_COUNTER]);
			_dbo.AddToDatabase(_newData);
			_ecobeeCfhLed.turnOn();
			isEcobeeCfh = true;
			_boilerStartRelayOutput.writeSync(0);
		} else {
			_ecobeeCfhLed.turnOff();
			isEcobeeCfh = false;
			_boilerStartRelayOutput.writeSync(1);
		} 
	});

	var boilerInterval;
	_boilerCfgInput.watch((err, value) => {
		if (value.toString() == 1) {
			clearInterval(boilerInterval);
			boilerInterval = setInterval(() => {
				_boilerCfgLed.turnOn();
				isBoilerCfg = true;
				if (isWellCharged) {
					_wellValveRelayOutput.writeSync(0);
					_columbiaValveRelayOutput.writeSync(1);
				} else {
					_columbiaValveRelayOutput.writeSync(0);
					_wellValveRelayOutput.writeSync(1);
				}
			}, 100);
			
		} else {
			clearInterval(boilerInterval);
			_boilerCfgLed.turnOff();
			isBoilerCfg = false;
			_columbiaValveRelayOutput.writeSync(1);
			_wellValveRelayOutput.writeSync(1);
		}
	});
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
	_ecobeeCfhCounterDisplay.write(_newData[_mapping.CFH_COUNTER]);

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