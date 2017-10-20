
var dbo = require('./database-operations');
var _constList = {
	0: 'Date',
	1: 'Recharge Timer',
	2: 'Columbia Timer',
	3: 'Well Timer',
	4: 'Call For Heat Counter',
}

var _data;

dbo.LoadDatabase(_constList, (data) => {
	_data = data;
	dbo.AddToDatabase(_data, _data.Date, new Date().getSeconds(), (data) => {
		_data = data;
	});
});