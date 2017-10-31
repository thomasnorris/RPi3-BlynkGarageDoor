
(function() {
	var	blynkLibrary = require('blynk-library');
	var	blynkAuth = require('./blynk-auth').GetAuth();
	var	_blynk = new blynkLibrary.Blynk(blynkAuth);
	var	_gpio = require('onoff').Gpio;
	var	_schedule = require('node-schedule');
	var	_dbo = require('./database-operations');
	var	_dto = require('./date-time-operations');

	const RECHARGE_TIME_MINUTES = 90;
	const ALL_TIMERS_INTERVAL_MILLI = 60000;
	const CRON_CSV_WRITE_SCHEDULE = '0 7,19 * * *';
	const CRON_ARCHIVE_SCHEDULE = '0 0 1 */1 *';

	// --Note: add new vPins, Leds, and Relays to the appropriate arrays in InitializeValues()
	var	_manualOverrideButton = new _blynk.VirtualPin(0); 
	var	_manualColumbiaButton = new _blynk.VirtualPin(1); 
	var	_manualWellButton = new _blynk.VirtualPin(2);
	var	_wellRechargeTimerDisplay = new _blynk.VirtualPin(3); 
	var	_wellRechargeCounterDisplay = new _blynk.VirtualPin(4);
	var	_columbiaTimerDisplay = new _blynk.VirtualPin(5);
	var	_usingColumbiaLed = new _blynk.WidgetLED(6);
	var	_wellTimerDisplay = new _blynk.VirtualPin(7);
	var	_usingWellLed = new _blynk.WidgetLED(8);
	var	_ecobeeCfhCounterDisplay = new _blynk.VirtualPin(9);
	var	_ecobeeCfhLed = new _blynk.WidgetLED(10);
	var	_boilerCfgLed = new _blynk.WidgetLED(11);

	var	_wellPressureSwitchInput = new _gpio(26, 'in', 'both');
	var	_boilerCfgInput = new _gpio(13, 'in', 'both');
	var	_ecobeeCfhInput = new _gpio(16, 'in', 'both');
	var	_columbiaValveRelayOutput = new _gpio(4, 'high');
	var	_wellValveRelayOutput = new _gpio(17, 'high');
	var	_boilerStartRelayOutput = new _gpio(27, 'high');

	var _mapping = {
		DATE: 'Date',
		WELL_RECHARGE_COUNTER: 'Recharge Counter',
		WELL_RECHARGE_TIMER: 'Recharge Timer',
		COLUMBIA_TIMER: 'Columbia Timer',
		WELL_TIMER: 'Well Timer',
		CFH_COUNTER : 'Call For Heat Counter'
	}

	var _newData;
	var _isWellCharged;

	// --Start main function
	_blynk.on('connect', () => {
		_dbo.LoadDatabase(_mapping, (recentData) => {
			_newData = recentData;

			// --All functions split up for readability
			InitializeValues();
			StartSchedules();
			MonitorEcobeeCallForHeat();
			MonitorWellPressureSwitch();
			MonitorBoilerAndManualValveControl();
		});
	});
	// --End main function

	function MonitorEcobeeCallForHeat() {
		_ecobeeCfhInput.watch((err, value) => {
			if (parseInt(value) === 1) {
				FormatAndAddToDatabase(_ecobeeCfhCounterDisplay, ++_newData[_mapping.CFH_COUNTER]);
				EnableRelayAndLed(_boilerStartRelayOutput, _ecobeeCfhLed);
			} else {
				DisableRelayAndLed(_boilerStartRelayOutput, _ecobeeCfhLed);
			} 
		});
	}

	function MonitorWellPressureSwitch() {
		_isWellCharged = (_newData[_mapping.WELL_RECHARGE_TIMER] === RECHARGE_TIME_MINUTES);
		
		var wellRechargeTimer;
		var wellRechargeTimerRunning = false;
		_wellPressureSwitchInput.watch((err, value) => {
			if (parseInt(value) === 1 && !wellRechargeTimerRunning) {
				_isWellCharged = false;
				wellRechargeTimerRunning = true;

				_newData[_mapping.WELL_RECHARGE_TIMER] = 0;
				wellRechargeTimer = StartTimer(() => {
					FormatAndAddToDatabase(_wellRechargeTimerDisplay, ++_newData[_mapping.WELL_RECHARGE_TIMER]);

					if (_newData[_mapping.WELL_RECHARGE_TIMER] === RECHARGE_TIME_MINUTES) {
						_isWellCharged = true;
						wellRechargeTimerRunning = false;
						StopTimer(wellRechargeTimer);
						FormatAndAddToDatabase(_wellRechargeCounterDisplay, ++_newData[_mapping.WELL_RECHARGE_COUNTER]);
					} 
				}, ALL_TIMERS_INTERVAL_MILLI);
			} 
		});
	}

	function MonitorBoilerAndManualValveControl() {
		var boilerTimer;
		var isCallForGas = false;
		var wellTimer;
		var wellTimerRunning = false;
		var columbiaTimer;
		var columbiaTimerRunning = false;
		var masterEnable = false;

		ManualValveControl(_manualColumbiaButton, StartColumbiaStopWell, _manualWellButton);
		ManualValveControl(_manualWellButton, StartWellStopColumbia, _manualColumbiaButton);

		_manualOverrideButton.on('write', (value) => {
			if (parseInt(value) === 1)
				masterEnable = true
			else {
				masterEnable = false;
				_manualColumbiaButton.write(0);
				_manualWellButton.write(0);
				StopBothColumbiaAndWell();
			}
		});

		_boilerCfgInput.watch((err, value) => {
			if (parseInt(value) === 1) {
				StopTimer(boilerTimer);
				boilerTimer = StartTimer(() => {
					_boilerCfgLed.turnOn();
					isCallForGas = true;
					if (_isWellCharged) 
						StartWellStopColumbia();
					else 
						StartColumbiaStopWell();
				}, 100);
			} else {
				StopBothColumbiaAndWell();
				StopTimer(boilerTimer);
				_boilerCfgLed.turnOff();
				isCallForGas = false;
			}
		});

		function StopBothColumbiaAndWell() {
			columbiaTimerRunning = false;
			wellTimerRunning = false;
			StopTimer(wellTimer, wellTimerRunning);
			StopTimer(columbiaTimer, columbiaTimerRunning);
			DisableRelayAndLed(_wellValveRelayOutput, _usingWellLed);
			DisableRelayAndLed(_columbiaValveRelayOutput, _usingColumbiaLed);
		}

		function StartWellStopColumbia() {
			columbiaTimerRunning = false;
			StopTimer(columbiaTimer);
			EnableRelayAndLed(_wellValveRelayOutput, _usingWellLed);
			DisableRelayAndLed(_columbiaValveRelayOutput, _usingColumbiaLed);
			if (!wellTimerRunning && isCallForGas) {
				wellTimerRunning = true;
				wellTimer = StartTimer(() => {
					FormatAndAddToDatabase(_wellTimerDisplay, ++_newData[_mapping.WELL_TIMER], true);
				}, ALL_TIMERS_INTERVAL_MILLI);
			}
		}

		function StartColumbiaStopWell() {
			wellTimerRunning = false;
			StopTimer(wellTimer);
			EnableRelayAndLed(_columbiaValveRelayOutput, _usingColumbiaLed);
			DisableRelayAndLed(_wellValveRelayOutput, _usingWellLed);
			if (!columbiaTimerRunning && isCallForGas) {
				columbiaTimerRunning = true;
				columbiaTimer = StartTimer(() => {
					FormatAndAddToDatabase(_columbiaTimerDisplay, ++_newData[_mapping.COLUMBIA_TIMER], true);
				}, ALL_TIMERS_INTERVAL_MILLI);
			}
		}

		function ManualValveControl(buttonToStart, startFunction, buttonToStop) {
			buttonToStart.on('write', (value) => {
				if (masterEnable) {
					if (parseInt(value) === 1) {
						startFunction();
						buttonToStop.write(0);
					}
					else
						StopBothColumbiaAndWell();
				} else
					buttonToStart.write(0);
			});
		}
	}

	function StartTimer(functionToStart, loopTimeMilli) {
		return setInterval(functionToStart, loopTimeMilli);
	}

	function StopTimer(timer) {
		clearInterval(timer);
	}

	function EnableRelayAndLed(relay, led) {
		relay.writeSync(0);
		led.turnOn();
	}

	function DisableRelayAndLed(relay, led) {
		relay.writeSync(1);
		led.turnOff();
	}

	function FormatAndAddToDatabase(display, dataToAdd, needsFormatting) {
		if (needsFormatting)
			display.write(_dto.MinutesAsHoursMins(dataToAdd));
		else
			display.write(dataToAdd);
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
		_wellRechargeTimerDisplay.write(_newData[_mapping.WELL_RECHARGE_TIMER]);

		var vPinArr = [_manualOverrideButton, _manualWellButton, _manualColumbiaButton]; // --No vPins from _mapping
		var relayArr = [_columbiaValveRelayOutput, _wellValveRelayOutput, _boilerStartRelayOutput]; // --Only relays (output gpio)
		var vLedArr = [_usingColumbiaLed, _usingWellLed, _ecobeeCfhLed, _boilerCfgLed]; // --All leds 

		relayArr.forEach((relay) => {
			relay.writeSync(1);
		});
		vPinArr.forEach((vPin) => {
			vPin.write(0);
		});
		vLedArr.forEach((vLed) => {
			vLed.turnOff();
		});
	}
})();
