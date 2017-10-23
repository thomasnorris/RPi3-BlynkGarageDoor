
var _dbo = require('./database-operations');
var _schedule = require('node-schedule');

var _date = {
	Prop: new Date()
}

var _recharge = {
	Prop: new Date().getSeconds()
}

var _columbia = {
	Prop: new Date().getMonth()
}

var _well = {
	Prop: new Date().getDate()
}

var _call = {
	Prop: new Date().getYear()
}

var _mapping = {
	'Date': _date,
	'Recharge Timer': _recharge,
	'Columbia Timer': _columbia,
	'Well Timer': _well,
	'Call For Heat Counter': _call 
}

_dbo.LoadDatabase(_mapping, () => {
	_schedule.scheduleJob('* * * * * *', () => {
		_mapping.Date.Prop = new Date().getSeconds();
		_dbo.AddToDatabase(_mapping);
	});
});