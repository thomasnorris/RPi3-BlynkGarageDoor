
(function() {
	var _dbo = require('./database-operations');
	var	_schedule = require('node-schedule');
	var	_rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
	var	_dto = require('./date-time-operations');

	var _mapping = require('./mapping').GetMapping();
	var _newData;

	_dbo.LoadDatabase(_mapping, (recentData) => {
		_newData = recentData;
		
		Fill(() => {
			console.log('Files created with dummy data.\nEnter \"a\" to run a test archive.\nEnter \"r\" to refresh the database.\nPress \"enter\" to exit.');
			_rl.on('line', (input) => {
				if (input == 'a') {
					_dbo.CreateArchives();
					console.log('Archive completed, exiting...');
				} else if (input === 'r') {
					_dbo.RefreshDatabase();
					console.log('Refresh completed, exiting...');
				}
				else
					console.log('Exiting.');
				_rl.close();
			});
		});
	}, true);

	function Fill(callback) {
		var i = 0;
		var max = 90;
		_newData[_mapping.WELL_TIMER] = max;
		var interval = setInterval(() => {
			if (i != max) {
				++_newData[_mapping.WELL_RECHARGE_COUNTER];
				++_newData[_mapping.COLUMBIA_TIMER];
				--_newData[_mapping.WELL_TIMER];
				_newData[_mapping.CFH_COUNTER] = Math.floor(Math.random() * (max - 1) + i);
				_newData[_mapping.WELL_RECHARGE_TIMER] = --_newData[_mapping.CFH_COUNTER];
				_dbo.AddToDatabase(_newData);
				_dbo.AddToCsv();
				i++;
			} else {
				clearInterval(interval);
				callback();
			}
		}, 10);
	}
})();