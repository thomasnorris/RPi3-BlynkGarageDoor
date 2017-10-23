
var _dbo = require('./database-operations');
var _schedule = require('node-schedule');

var _mapping = {
	0: 'Date',
	1: 'Recharge Timer',
	2: 'Columbia Timer',
	3: 'Well Timer',
	4: 'Call For Heat Counter'
}

var _blynkValues = [];

_dbo.LoadDatabase(_mapping, (recentData) => {
	//_schedule.scheduleJob('* * * * * *', () => {
    //
	//});
	var recentValues = [];
	Object.keys(recentData).forEach((key) => {
		recentValues.push(recentData[key]);
	});

	for (var i = 1; i < recentValues.length; i++) {
		if (recentValues[i] == undefined)
			_blynkValues[i - 1] = 0;
		else
			_blynkValues[i - 1] = recentValues[i];
	}	

	_dbo.AddToDatabase(_blynkValues);
});