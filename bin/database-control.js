
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

	_dbo.AddToDatabase([GetCurrentDate(), _blynkValues[0], _blynkValues[1], _blynkValues[2], _blynkValues[3]]);
});

function GetCurrentDate() {
	var today = new Date();
	var dd = today.getDate();
	var mm = today.getMonth() + 1;
	if (dd < 10)
		dd = '0' + dd;
	if (mm < 10)
		mm = '0' + mm;

	return mm + '/' + dd + '/' + today.getFullYear();
}