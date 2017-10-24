
var _dbo = require('./database-operations');
var _schedule = require('node-schedule');

var _mapping = {
	DATE: 'Date',
	WELL_RECHARGE_COUNTER: 'Recharge Counter',
	COLUMBIA_TIMER: 'Columbia Timer',
	WELL_TIMER: 'Well Timer',
	CFH_COUNTER : 'Call For Heat Counter'
}

var _newData = [];

_dbo.LoadDatabase(_mapping, (recentData) => {
	_newData = recentData;
	//setInterval(() => {
	//	console.log(++_newData[_mapping.WELL_RECHARGE_COUNTER]);
	//	_dbo.AddToDatabase(_newData);
	//	_dbo.WriteToCsv();
	//}, 100);
	
	_dbo.CreateArchives(_mapping);
});