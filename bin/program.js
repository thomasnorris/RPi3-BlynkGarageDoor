
(function() {
	// --Setup Blynk in another file and pass it in to start the rest of the program
	var _localModule = require('local/paths').GetModule;
	_localModule('blynk-setup').Setup((_blynk) => {
		var _gpio = require('onoff').Gpio;
		var _schedule = require('node-schedule');
		var _dbo = _localModule('database-operations');
		var _dto = _localModule('date-time-operations');

		const RECHARGE_TIME_MINUTES = 90;
		const ALL_TIMERS_INTERVAL_MILLI = 60000;
		const INPUT_CHECK_INTERVAL_MILLI = 50;
		const CRON_CSV_WRITE_SCHEDULE = '0 7,19 * * *'; // --Every day at 7 am/pm
		const CRON_ARCHIVE_SCHEDULE = '0 0 1 1-6,8-12 *'; // --Every 1st of every month excluding July at 12:00 am
		const CRON_DB_REFRESH_SCHEDULE = '0 0 2-31 */1 *'; // --Every 2-31 days of the month at 12:00 am
		const CRON_RESET_SCHEDULE = '0 0 1 7 *'; // --The 1st of July every year at 12:00 am

		var _manualOverrideButton = new _blynk.VirtualPin(0); 
		var _manualColumbiaButton = new _blynk.VirtualPin(1); 
		var _manualWellButton = new _blynk.VirtualPin(2);
		var _wellRechargeTimerDisplay = new _blynk.VirtualPin(3); 
		var _wellRechargeCounterDisplay = new _blynk.VirtualPin(4);
		var _columbiaTimerDisplay = new _blynk.VirtualPin(5);
		var _usingColumbiaLed = new _blynk.WidgetLED(6);
		var _wellTimerDisplay = new _blynk.VirtualPin(7);
		var _usingWellLed = new _blynk.WidgetLED(8);
		var _ecobeeCfhCounterDisplay = new _blynk.VirtualPin(9);
		var _ecobeeCfhLed = new _blynk.WidgetLED(10);
		var _boilerCfgLed = new _blynk.WidgetLED(11);
		var _ecobeeCfhTimerDisplay = new _blynk.VirtualPin(12);
		var _systemUptimeTimerDisplay = new _blynk.VirtualPin(13);
		var _BoilerOfftimeTimerDisplay = new _blynk.VirtualPin(14);

		var _wellPressureSwitchInput = new _gpio(26, 'in', 'both');
		var _boilerCfgInput = new _gpio(13, 'in', 'both');
		var _ecobeeCfhInput = new _gpio(16, 'in', 'both');
		var _columbiaValveRelayOutput = new _gpio(4, 'high');
		var _wellValveRelayOutput = new _gpio(17, 'high');
		var _boilerStartRelayOutput = new _gpio(27, 'high');
		
		var _mapping = require('./mapping').GetMapping();
		var _data;
		var _isWellCharged;
		var _isCallForHeat = false;
		var _manualOverrideEnable = false;

		// --Start main function
		_dbo.LoadDatabase((data) => {
			_data = data;

			// --All functions split up for readability
			InitializeValues();
			StartSchedules();
			MonitorEcobeeCallForHeat();
			MonitorWellPressureSwitch();
			MonitorValvesAndCallForGas();
		});
		// --End main function

		function MonitorEcobeeCallForHeat() {
			var countLogged = false;
			var cfhTimerRunning = false;
			var cfhTimer;
			var boilerOfftimeTimerRunning = false;
			var boilerOfftimeTimer;
			StartTimer(() => {
				if (_ecobeeCfhInput.readSync() === 1 && !_manualOverrideEnable) {
					if (!countLogged) {
						AddToDatabaseAndDisplay(_ecobeeCfhCounterDisplay, ++_data[_mapping.CFH_COUNTER]);
						countLogged = true;
					}
					_isCallForHeat = true;
					EnableRelayAndLed(_boilerStartRelayOutput, _ecobeeCfhLed);
					StopTimer(boilerOfftimeTimer);
					boilerOfftimeTimerRunning = false;
					_BoilerOfftimeTimerDisplay.write(PrettyPrint(0));
					if (!cfhTimerRunning) {
						cfhTimerRunning = true;
						var i = 0;
						cfhTimer = StartTimer(() => {
							_ecobeeCfhTimerDisplay.write(PrettyPrint(++i));
						}, ALL_TIMERS_INTERVAL_MILLI);
					}
				} else {
					if (!boilerOfftimeTimerRunning) {
						boilerOfftimeTimerRunning = true;
						var i = 0;
						boilerOfftimeTimer = StartTimer(() => {
							_BoilerOfftimeTimerDisplay.write(PrettyPrint(++i));
						}, ALL_TIMERS_INTERVAL_MILLI)
					}
					countLogged = false;
					_isCallForHeat = false;
					DisableRelayAndLed(_boilerStartRelayOutput, _ecobeeCfhLed);
					StopTimer(cfhTimer);
					cfhTimerRunning = false;
					_ecobeeCfhTimerDisplay.write(PrettyPrint(0));
				} 

			}, INPUT_CHECK_INTERVAL_MILLI);
		}

		function MonitorWellPressureSwitch() {
			_isWellCharged = (_data[_mapping.WELL_RECHARGE_TIMER] === RECHARGE_TIME_MINUTES);
			
			var wellRechargeTimer;
			var wellRechargeTimerRunning = false;
			StartTimer(() => {
				if (_wellPressureSwitchInput.readSync() === 1 && !wellRechargeTimerRunning && _data[_mapping.WELL_RECHARGE_TIMER] !== RECHARGE_TIME_MINUTES) {
					_isWellCharged = false;
					wellRechargeTimerRunning = true;

					wellRechargeTimer = StartTimer(() => {
						AddToDatabaseAndDisplay(_wellRechargeTimerDisplay, ++_data[_mapping.WELL_RECHARGE_TIMER]);

						if (_data[_mapping.WELL_RECHARGE_TIMER] === RECHARGE_TIME_MINUTES) {
							_isWellCharged = true;
							StopTimer(wellRechargeTimer);
							AddToDatabaseAndDisplay(_wellRechargeCounterDisplay, ++_data[_mapping.WELL_RECHARGE_COUNTER]);
						} 
					}, ALL_TIMERS_INTERVAL_MILLI);
				} 
				else if (_wellPressureSwitchInput.readSync() === 0) {
					if (_data[_mapping.WELL_RECHARGE_TIMER] === RECHARGE_TIME_MINUTES)
						_data[_mapping.WELL_RECHARGE_TIMER] = 0;
					StopTimer(wellRechargeTimer);
					wellRechargeTimerRunning = false;
					_isWellCharged = false;
				}
			}, INPUT_CHECK_INTERVAL_MILLI);
		}

		function MonitorValvesAndCallForGas() {
			var boilerTimer;
			var wellTimer;
			var wellTimerRunning = false;
			var wellManualValve = false;
			var columbiaTimer;
			var columbiaTimerRunning = false;
			var columbiaManualValve = false;
			var isCallForGas = false;


			MonitorManualValveOverrideButton();
			MonitorBoilerCallForGas();
			ManualColumbiaValveControl();
			ManualWellValveControl();

			function MonitorManualValveOverrideButton() {
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
			}

			function MonitorBoilerCallForGas() {
				var timerRunning = false;
				StartTimer(() => {
					if (!_manualOverrideEnable) {
						if (_boilerCfgInput.readSync() === 1 && !timerRunning) {
							timerRunning = true;
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
							timerRunning = false;
							StopBothColumbiaAndWell();
							StopTimer(boilerTimer);
							_boilerCfgLed.turnOff();
							isCallForGas = false;
						}
					}
				}, INPUT_CHECK_INTERVAL_MILLI);
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

			function StopBothColumbiaAndWell() {
				columbiaManualValve = false;
				wellManualValve = false;
				columbiaTimerRunning = false;
				wellTimerRunning = false;
				StopTimer(wellTimer);
				StopTimer(columbiaTimer);
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
						AddToDatabaseAndDisplay(_wellTimerDisplay, ++_data[_mapping.WELL_TIMER], true);
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
						AddToDatabaseAndDisplay(_columbiaTimerDisplay, ++_data[_mapping.COLUMBIA_TIMER], true);
					}, ALL_TIMERS_INTERVAL_MILLI);
				}
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

		function AddToDatabaseAndDisplay(display, dataToAdd, prettyPrint) {
			if (prettyPrint)
				display.write(PrettyPrint(dataToAdd));
			else
				display.write(dataToAdd);
			_dbo.AddToDatabase(_data, true);
		}

		function StartSchedules() {

			CreateNormalSchedule(CRON_CSV_WRITE_SCHEDULE, _dbo.AddToCsv);

			// --File safe schedueles will add a minute to the schedule and try again if the system could be reading or writing to a file
			CreateFileSafeSchedule(CRON_RESET_SCHEDULE, ResetSystemToZero) // --Does not call _dbo directly
			CreateFileSafeSchedule(CRON_ARCHIVE_SCHEDULE, _dbo.CreateArchives, () => {}); // --Empty callback is necessary
			CreateFileSafeSchedule(CRON_DB_REFRESH_SCHEDULE, _dbo.RefreshDatabase);

			function CreateFileSafeSchedule(originalSchedule, functionToStart, functionCallback) {
				var newSchedule = originalSchedule;
				var job = _schedule.scheduleJob(originalSchedule, () => {
					job.cancel();
					if (!_isCallForHeat && _isWellCharged) {
						functionToStart(functionCallback);
						job.reschedule(originalSchedule);
					} else {
						var arr = newSchedule.split(' ');
						arr[0] = parseInt(arr[0]) + 1;
						newSchedule = arr.join(' ');
						job.reschedule(newSchedule);
					}
				});
			}

			function CreateNormalSchedule(schedule, functionToStart) {
				_schedule.scheduleJob(schedule, () => {
					functionToStart();
				});
			}
		}

		function InitializeValues() {
			_wellRechargeCounterDisplay.write(_data[_mapping.WELL_RECHARGE_COUNTER]);
			_columbiaTimerDisplay.write(PrettyPrint(_data[_mapping.COLUMBIA_TIMER]));
			_wellTimerDisplay.write(PrettyPrint(_data[_mapping.WELL_TIMER]));
			_ecobeeCfhCounterDisplay.write(_data[_mapping.CFH_COUNTER]);

			// --Force the well to be fully charged on a total restart
			if (_data[_mapping.WELL_RECHARGE_TIMER] === 0)
				_data[_mapping.WELL_RECHARGE_TIMER] = RECHARGE_TIME_MINUTES;

			_wellRechargeTimerDisplay.write(_data[_mapping.WELL_RECHARGE_TIMER]);
			_ecobeeCfhTimerDisplay.write(PrettyPrint(0));

			var i = 0;
			_systemUptimeTimerDisplay.write(PrettyPrint(i));
			StartTimer(() => {
				_systemUptimeTimerDisplay.write(PrettyPrint(++i));
			}, ALL_TIMERS_INTERVAL_MILLI);

			_BoilerOfftimeTimerDisplay.write(PrettyPrint(0));
		}

		function ResetSystemToZero() {
			_dbo.ResetSystemToZero((data) => {
				_data = data;
				InitializeValues();
			});
		}

		function PrettyPrint(min) {
			return _dto.ConvertMinutesToHoursAndMintues(min).PrettyPrint();
		}
	});
})();
