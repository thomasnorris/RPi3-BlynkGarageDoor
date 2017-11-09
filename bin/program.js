
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
	const INPUT_CHECK_INTERVAL_MILLI = 50;
	const CRON_CSV_WRITE_SCHEDULE = '0 7,19 * * *'; // --Every day at 7 am/pm
	const CRON_ARCHIVE_SCHEDULE = '0 0 1 */1 *'; // --Every month at 12:00 am on the 1st
	const CRON_DB_REFRESH_SCHEDULE = '0 0 */1 * *'; // --Every day at 12:00 am

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

	
	var _mapping = require('./mapping').GetMapping();
	var _newData;
	var _isWellCharged;
	var _isCallForHeat = false;
	var _manualOverrideEnable = false;

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
		var countLogged = true;
		StartTimer(() => {
			if (_ecobeeCfhInput.readSync() === 1 && !_manualOverrideEnable) {
				if (!countLogged) {
					FormatAndAddToDatabase(_ecobeeCfhCounterDisplay, ++_newData[_mapping.CFH_COUNTER]);
					countLogged = true;
				}
				_isCallForHeat = true;
				EnableRelayAndLed(_boilerStartRelayOutput, _ecobeeCfhLed);
			} else {
				countLogged = false;
				_isCallForHeat = false;
				DisableRelayAndLed(_boilerStartRelayOutput, _ecobeeCfhLed);
			} 
		}, INPUT_CHECK_INTERVAL_MILLI);
	}

	function MonitorWellPressureSwitch() {
		_isWellCharged = (_newData[_mapping.WELL_RECHARGE_TIMER] === RECHARGE_TIME_MINUTES);
		
		var wellRechargeTimer;
		var wellRechargeTimerRunning = false;
		StartTimer(() => {
			if (_wellPressureSwitchInput.readSync() === 1 && !wellRechargeTimerRunning && _newData[_mapping.WELL_RECHARGE_TIMER] !== RECHARGE_TIME_MINUTES) {
				_isWellCharged = false;
				wellRechargeTimerRunning = true;

				wellRechargeTimer = StartTimer(() => {
					FormatAndAddToDatabase(_wellRechargeTimerDisplay, ++_newData[_mapping.WELL_RECHARGE_TIMER]);

					if (_newData[_mapping.WELL_RECHARGE_TIMER] === RECHARGE_TIME_MINUTES) {
						_isWellCharged = true;
						StopTimer(wellRechargeTimer);
						FormatAndAddToDatabase(_wellRechargeCounterDisplay, ++_newData[_mapping.WELL_RECHARGE_COUNTER]);
					} 
				}, ALL_TIMERS_INTERVAL_MILLI);
			} 
			else if (_wellPressureSwitchInput.readSync() === 0) {
				if (_newData[_mapping.WELL_RECHARGE_TIMER] === RECHARGE_TIME_MINUTES)
					_newData[_mapping.WELL_RECHARGE_TIMER] = 0;
				StopTimer(wellRechargeTimer);
				wellRechargeTimerRunning = false;
				_isWellCharged = false;
			}
		}, INPUT_CHECK_INTERVAL_MILLI);
	}

	function MonitorBoilerAndManualValveControl() {
		var boilerTimer;
		var wellTimer;
		var wellTimerRunning = false;
		var wellManualValve = false;
		var columbiaTimer;
		var columbiaTimerRunning = false;
		var columbiaManualValve = false;
		var isCallForGas = false;

		ManualColumbiaValveControl();
		ManualWellValveControl();

		_manualOverrideButton.on('write', (value) => {
			if (!_isCallForHeat) {
				if (parseInt(value) === 1)
					_manualOverrideEnable = true;
				else {
					_manualOverrideEnable = false;
					_manualColumbiaButton.write(0);
					_manualWellButton.write(0);
					StopBothColumbiaAndWell();
				}
			}
			else
				_manualOverrideButton.write(0);
		});

		var timerStarted = false;
		StartTimer(() => {
			if (!_manualOverrideEnable) {
				if (_boilerCfgInput.readSync() === 1 && !timerStarted) {
					timerStarted = true
					StopTimer(boilerTimer);
					boilerTimer = StartTimer(() => {
						_boilerCfgLed.turnOn();
						isCallForGas = true;
						if (_isWellCharged) 
							StartWellStopColumbia();
						else 
							StartColumbiaStopWell();
					}, 100);
				} else if (_boilerCfgInput.readSync() === 0) {
					timerStarted = false;
					StopBothColumbiaAndWell();
					StopTimer(boilerTimer);
					_boilerCfgLed.turnOff();
					isCallForGas = false;
				}
			}
		}, INPUT_CHECK_INTERVAL_MILLI);

		function StopBothColumbiaAndWell() {
			columbiaManualValve = false;
			wellManualValve = false;
			columbiaTimerRunning = false;
			wellTimerRunning = false;
			StopTimer(wellTimer, wellTimerRunning);
			StopTimer(columbiaTimer, columbiaTimerRunning);
			DisableRelayAndLed(_wellValveRelayOutput, _usingWellLed);
			DisableRelayAndLed(_columbiaValveRelayOutput, _usingColumbiaLed);
		}

		function StartWellStopColumbia() {
			columbiaManualValve = false;
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
			wellManualValve = false;
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

		function ManualColumbiaValveControl() {
			_manualColumbiaButton.on('write', (value) => {
				if (_manualOverrideEnable) {
					if (parseInt(value) === 1) {
						columbiaManualValve = true;
						StartColumbiaStopWell();
						_manualWellButton.write(0);
					}
					else {
						columbiaManualValve = false;
						StopBothColumbiaAndWell();
					}
				} else
					_manualColumbiaButton.write(0);
			});
		}

		function ManualWellValveControl() {
			_manualWellButton.on('write', (value) => {
				if (_manualOverrideEnable) {
					if (parseInt(value) === 1) {
						wellManualValve = true;
						StartWellStopColumbia();
						_manualColumbiaButton.write(0);
					}
					else {
						wellManualValve = false;
						StopBothColumbiaAndWell();
					}
				} else
					_manualWellButton.write(0);
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
		/*
		_schedule.scheduleJob(CRON_CSV_WRITE_SCHEDULE, () => {
			_dbo.AddToCsv();
		});
		_schedule.scheduleJob(CRON_ARCHIVE_SCHEDULE, () => {
			_dbo.CreateArchives();
		});
		_schedule.scheduleJob(CRON_DB_REFRESH_SCHEDULE, () => {
			_dbo.RefreshDatabase();
		});
		*/

		CreateSchedule(CRON_CSV_WRITE_SCHEDULE, _dbo.AddToCsv);
		CreateSchedule(CRON_ARCHIVE_SCHEDULE, _dbo.CreateArchives);
		CreateSchedule(CRON_DB_REFRESH_SCHEDULE, _dbo.RefreshDatabase);

		function CreateSchedule(originalSchedule, executeFunction) {
			var newSchedule = originalSchedule;
			var job = _schedule.scheduleJob(originalSchedule, () => {
				job.cancel();
				if (!_isCallForHeat && _isWellCharged) {
					executeFunction();
					job.reschedule(originalSchedule);
				} else {
					var arr = newSchedule.split(' ');
					arr[0] = parseInt(arr[0]) + 1;
					newSchedule = arr.join(' ');
					job.reschedule(newSchedule);
				}
			});
		}
	}

	function InitializeValues() {
		_wellRechargeCounterDisplay.write(_newData[_mapping.WELL_RECHARGE_COUNTER]);
		_columbiaTimerDisplay.write(_dto.MinutesAsHoursMins(_newData[_mapping.COLUMBIA_TIMER]));
		_wellTimerDisplay.write(_dto.MinutesAsHoursMins(_newData[_mapping.WELL_TIMER]));
		_ecobeeCfhCounterDisplay.write(_newData[_mapping.CFH_COUNTER]);

		if (_newData[_mapping.WELL_RECHARGE_TIMER] === 0)
			_newData[_mapping.WELL_RECHARGE_TIMER] = RECHARGE_TIME_MINUTES;

		_wellRechargeTimerDisplay.write(_newData[_mapping.WELL_RECHARGE_TIMER]);
	}
})();
