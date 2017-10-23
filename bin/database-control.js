
var _dbo = require('./database-operations');
var _schedule = require('node-schedule');

var _mapping = {
	0: 'Date',
	1: 'Recharge Counter',
	2: 'Columbia Timer',
	3: 'Well Timer',
	4: 'Call For Heat Counter'
}

_dbo.LoadDatabase(_mapping, (recentData) => {
	//_schedule.scheduleJob('0 0 7,19 * * *', () => {
    //
	//});
	console.log(++recentData[1]);
	_dbo.AddToDatabase(recentData);
});