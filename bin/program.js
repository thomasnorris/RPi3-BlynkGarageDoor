
// Global logger setup
var _path = require('path');
global._logger = require(_path.resolve(__dirname, '../', 'Node-Logger', 'app.js'));
_logger.Init();

// --Set this so requireLocal can be used in all files without importing
global.requireLocal = require('local-modules').GetModule;

(function() {
	// --Setup Blynk in another file and pass it in to start the rest of the program
	requireLocal('blynk-setup').Setup((_blynk) => {
		_logger.Info.Async('Blynk configured and connected');
		var _gpio = require('onoff').Gpio;
		var _dbo = requireLocal('database-operations');
		var _guo = requireLocal('gas-use-operations');

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
		var _boilerOfftimeTimerDisplay = new _blynk.VirtualPin(14);
		var _wellSavingsDisplay = new _blynk.VirtualPin(15);
		var _wellPercentUsedDisplay = new _blynk.VirtualPin(16);

		var _wellPressureSwitchInput = new _gpio(26, 'in', 'both');
		var _boilerCfgInput = new _gpio(13, 'in', 'both');
		var _ecobeeCfhInput = new _gpio(16, 'in', 'both');
		var _columbiaValveRelayOutput = new _gpio(4, 'high');
		var _wellValveRelayOutput = new _gpio(17, 'high');
		var _boilerStartRelayOutput = new _gpio(27, 'high');

		var _mapping = requireLocal('mapping').GetMapping();
		var _data;
		var _isWellCharged;
		var _isCallForHeat = false;
		var _manualOverrideEnable = false;

		// --Start main function
		_dbo.LoadDatabase((data) => {
			_logger.Info.Async('Database loaded');
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
			_logger.Info.Async('Monitoring started', 'Call for heat');

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

					if (!cfhTimerRunning) {
						cfhTimerRunning = true;
						var i = 0;
						cfhTimer = StartTimer(() => {
							_ecobeeCfhTimerDisplay.write(PrettyPrint(++i));
						}, ALL_TIMERS_INTERVAL_MILLI);
					}

					_isCallForHeat = true;
					EnableRelayAndLed(_boilerStartRelayOutput, _ecobeeCfhLed);
					StopTimer(boilerOfftimeTimer);
					boilerOfftimeTimerRunning = false;
					_boilerOfftimeTimerDisplay.write(PrettyPrint(0));
				}
				else {
					if (!boilerOfftimeTimerRunning) {
						boilerOfftimeTimerRunning = true;
						var i = 0;
						boilerOfftimeTimer = StartTimer(() => {
							_boilerOfftimeTimerDisplay.write(PrettyPrint(++i));
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
			_logger.Info.Async('Monitoring started', 'Well pressures switch');

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
			_logger.Info.Async('Monitoring started', 'Valves and call for gas');

			var boilerTimer;
			var wellTimer;
			var wellTimerRunning = false;
			var columbiaTimer;
			var columbiaTimerRunning = false;
			var isCallForGas = false;

			ManualValveControl(_manualColumbiaButton, StartColumbiaStopWell, _manualWellButton, StopBothColumbiaAndWell);
			ManualValveControl(_manualWellButton, StartWellStopColumbia, _manualColumbiaButton, StopBothColumbiaAndWell);

			(function MonitorManualValveOverrideButton() {
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
			})();

			(function MonitorBoilerCallForGas() {
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
						}
						else if (_boilerCfgInput.readSync() === 0) {
							timerRunning = false;
							StopBothColumbiaAndWell();
							StopTimer(boilerTimer);
							_boilerCfgLed.turnOff();
							isCallForGas = false;
						}
					}
				}, INPUT_CHECK_INTERVAL_MILLI);
			})();

			function ManualValveControl(button, startFunction, otherButton, stopFunction) {
				button.on('write', (value) => {
					if (_manualOverrideEnable) {
						if (parseInt(value) === 1) {
							startFunction()
							otherButton.write(0);
						}
						else
							stopFunction();
					}
					else
						button.write(0);
				})
			}

			function StopBothColumbiaAndWell() {
				columbiaTimerRunning = false;
				wellTimerRunning = false;
				StopTimer(wellTimer);
				StopTimer(columbiaTimer);
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
						++_data[_mapping.WELL_TIMER];
						AddToDatabaseAndDisplay(_wellTimerDisplay, _data[_mapping.WELL_TIMER], true);
						_wellSavingsDisplay.write(GetWellSavings());
						_wellPercentUsedDisplay.write(GetPercentGasUsed());
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
						AddToDatabaseAndDisplay(_columbiaTimerDisplay, ++_data[_mapping.COLUMBIA_TIMER], true);
						_wellPercentUsedDisplay.write(GetPercentGasUsed());
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
			var nodeSchedule = require('node-schedule');

			CreateNormalSchedule(CRON_CSV_WRITE_SCHEDULE, _dbo.AddToCsv);

			// --File safe schedueles will add a minute to the schedule and try again if the system could be reading or writing to a file
			CreateFileSafeSchedule(CRON_RESET_SCHEDULE, ResetSystemToZero) // --Does not call _dbo directly
			CreateFileSafeSchedule(CRON_ARCHIVE_SCHEDULE, _dbo.CreateArchives, () => {}); // --Empty callback is necessary
			CreateFileSafeSchedule(CRON_DB_REFRESH_SCHEDULE, _dbo.RefreshDatabase);

			_logger.Info.Async('Schedules created');

			function CreateFileSafeSchedule(originalSchedule, functionToStart, functionCallback) {
				var newSchedule = originalSchedule;
				var job = nodeSchedule.scheduleJob(originalSchedule, () => {
					job.cancel();
					if (!_isCallForHeat && _isWellCharged) {
						functionToStart(functionCallback);
						job.reschedule(originalSchedule);
					}
					else {
						var arr = newSchedule.split(' ');
						arr[0] = parseInt(arr[0]) + 1;

						// Increase the hour by 1 if need be
						if (arr[0] == 60) {
							arr[0] = 0;
							arr[1] = parseInt(arr[1]) + 1;
						}

						// --Reset to the original schedule if 24 hours have passed
						arr[1] == 24 ? newSchedule = originalSchedule : newSchedule = arr.join(' ');

						job.reschedule(newSchedule);
					}
				});
			}

			function CreateNormalSchedule(schedule, functionToStart) {
				nodeSchedule.scheduleJob(schedule, () => {
					functionToStart();
				});
			}
		}

		function InitializeValues() {
			_wellRechargeCounterDisplay.write(_data[_mapping.WELL_RECHARGE_COUNTER]);
			_columbiaTimerDisplay.write(PrettyPrint(_data[_mapping.COLUMBIA_TIMER]));
			_wellTimerDisplay.write(PrettyPrint(_data[_mapping.WELL_TIMER]));
			_ecobeeCfhCounterDisplay.write(_data[_mapping.CFH_COUNTER]);
			_wellSavingsDisplay.write(GetWellSavings());
			_wellPercentUsedDisplay.write(GetPercentGasUsed());

			// --Force the well to be fully charged on a total restart
			if (_data[_mapping.WELL_RECHARGE_TIMER] === 0)
				_data[_mapping.WELL_RECHARGE_TIMER] = RECHARGE_TIME_MINUTES;

			_wellRechargeTimerDisplay.write(_data[_mapping.WELL_RECHARGE_TIMER]);
			_ecobeeCfhTimerDisplay.write(PrettyPrint(0));

			var i = 0;
			_systemUptimeTimerDisplay.write(PrettyPrint(0));
			StartTimer(() => {
				_systemUptimeTimerDisplay.write(PrettyPrint(++i));
			}, ALL_TIMERS_INTERVAL_MILLI);

			_boilerOfftimeTimerDisplay.write(PrettyPrint(0));
			_logger.Info.Async('Values initialized');
		}

		function ResetSystemToZero() {
			_dbo.ResetSystemToZero((data) => {
				_data = data;
				InitializeValues();
			});
		}

		function PrettyPrint(min) {
			var dto = requireLocal('date-time-operations');
			return dto.ConvertMinutesToHoursAndMintues(min).PrettyPrint();
		}

		function GetWellSavings() {
			return _guo.ConvertMinutesOfUseToDollarsSaved(_data[_mapping.WELL_TIMER]);
		}

		function GetPercentGasUsed() {
			return _guo.GetPercentGasUsed(_data[_mapping.WELL_TIMER], _data[_mapping.COLUMBIA_TIMER]);
		}
	});
})();
