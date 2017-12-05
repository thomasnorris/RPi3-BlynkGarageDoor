
global.requireLocal = require('local/paths').GetModule;

(function() {
	var _dbo = requireLocal('database-operations');
	var	_schedule = require('node-schedule');
	var	_rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
	var	_dto = requireLocal('date-time-operations');

	var _mapping = requireLocal('mapping').GetMapping();
	var _data;

	_dbo.LoadDatabase((data) => {
		_data = data;
		
		Fill(() => {
			console.log('Files created with dummy data.\nEnter \"a\" to run a test archive.\nEnter \"ref\" to refresh the database.\nEnter \"res\" to reset everything.\nPress \"enter\" to exit.');
			_rl.on('line', (input) => {
				if (input == 'a') 
					DoAThing(_dbo.CreateArchives, "Archive", () => {});
				else if (input === 'ref') 
					DoAThing(_dbo.RefreshDatabase, "Refresh");
				else if (input === 'res') 
					DoAThing(_dbo.ResetSystemToZero, "Reset", (data) => {});
				else
					DoAThing(process.exit, "Nothing");
				_rl.close();
			});
		});

		function DoAThing(thing, message, callback) {
			console.log(message + ' completed, exiting...');
			thing(callback);
		}

	}, true);

	function Fill(callback) {
		var i = 0;
		var max = 90;
		_data[_mapping.WELL_TIMER] = max;
		var interval = setInterval(() => {
			if (i != max) {
				++_data[_mapping.WELL_RECHARGE_COUNTER];
				++_data[_mapping.COLUMBIA_TIMER];
				--_data[_mapping.WELL_TIMER];
				_data[_mapping.CFH_COUNTER] = Math.floor(Math.random() * (max - 1) + i);
				_data[_mapping.WELL_RECHARGE_TIMER] = --_data[_mapping.CFH_COUNTER];
				_dbo.AddToDatabase(_data, true);
				_dbo.AddToCsv();
				i++;
			} else {
				clearInterval(interval);
				callback();
			}
		}, 10);
	}
})();