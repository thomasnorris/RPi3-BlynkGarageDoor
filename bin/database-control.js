
var _dbo = require('./database-operations');
var _schedule = require('node-schedule');



var _mapping = {
	0: 'Date',
	1: 'Recharge Timer',
	2: 'Columbia Timer',
	3: 'Well Timer',
	4: 'Call For Heat Counter'
}

_dbo.LoadDatabase(_mapping, (recentData) => {
	//_schedule.scheduleJob('* * * * * *', () => {
    //
	//});
	console.log(recentData);
	_dbo.AddToDatabase([new Date(), 5, 77, 55, 6]);
});