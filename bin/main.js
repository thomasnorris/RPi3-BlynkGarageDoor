
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
		StartInputMonitoring();
		StartSchedules();
	});
});

function StartInputMonitoring() {
	var isWellCharged = false;

	var wellRechargeInterval;
	var chargeInProgress = false;
	_wellPressureSwitchInput.watch((err, value) => {
		if (value.toString() == 1 && !chargeInProgress) {
			chargeInProgress = true;
			isWellCharged = false;

			var i = 0;
			wellRechargeInterval = setInterval(() => {
				if (i != RECHARGE_TIME_MINUTES)
					_wellRechargeLevelDisplay.write(++i);
				else {
					IncrementAndAddToDatabase(_wellRechargeCounterDisplay, _mapping.WELL_RECHARGE_COUNTER);
					isWellCharged = true;
					chargeInProgress = false;
					clearInterval(wellRechargeInterval);
				} 
			}, RECHARGE_INTERVAL_MILLI);
		} 
	});

	_ecobeeCfhInput.watch((err, value) => {
		if (value.toString() == 1) {
			IncrementAndAddToDatabase(_ecobeeCfhCounterDisplay, _mapping.CFH_COUNTER);
			EnableRelayAndLed(_boilerStartRelayOutput, _ecobeeCfhLed);
		} else {
			DisableRelayAndLed(_boilerStartRelayOutput, _ecobeeCfhLed);
		} 
	});

	var boilerInterval;
	var wellTimerRunning = false;
	var columbiaTimerRunning = false;
	var wellInterval;
	var columbiaInterval;
	_boilerCfgInput.watch((err, value) => {
		if (value.toString() == 1) {
			clearInterval(boilerInterval);
			boilerInterval = setInterval(() => {
				_boilerCfgLed.turnOn();
				if (isWellCharged) {
					clearInterval(columbiaInterval);
					EnableRelayAndLed(_wellValveRelayOutput, _usingWellLed);
					DisableRelayAndLed(_columbiaValveRelayOutput, _usingColumbiaLed);
					if (!wellTimerRunning) {
						wellTimerRunning = true;
						wellInterval = setInterval(() => {
							IncrementAndAddToDatabase(_wellTimerDisplay, _mapping.WELL_TIMER, true);
						}, 1000);
					}
				} else {
					clearInterval(wellInterval);
					EnableRelayAndLed(_columbiaValveRelayOutput, _usingColumbiaLed);
					DisableRelayAndLed(_wellValveRelayOutput, _usingWellLed);
					if (!columbiaTimerRunning) {
						columbiaTimerRunning = true;
						columbiaInterval = setInterval(() => {
							IncrementAndAddToDatabase(_columbiaTimerDisplay, _mapping.COLUMBIA_TIMER, true);
						}, 1000);
					}
				}
			}, 100);
			
		} else {
			clearInterval(boilerInterval);
			clearInterval(wellInterval);
			clearInterval(columbiaInterval);
			wellTimerRunning = false;
			columbiaTimerRunning = false;
			DisableRelayAndLed(_wellValveRelayOutput, _usingWellLed);
			DisableRelayAndLed(_columbiaValveRelayOutput, _usingColumbiaLed);
			_usingColumbiaLed.turnOff();
		}
	});
}

function EnableRelayAndLed(relay, led) {
	relay.writeSync(0);
	led.turnOn();
}

function DisableRelayAndLed(relay, led) {
	relay.writeSync(1);
	led.turnOff();
}

function IncrementAndAddToDatabase(display, dataSection, needsFormatting) {
	if (needsFormatting)
		display.write(_dto.MinutesAsHoursMins(++_newData[dataSection]));
	else
		display.write(++_newData[dataSection]);
	_dbo.AddToDatabase(_newData);
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