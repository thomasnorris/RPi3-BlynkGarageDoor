
var dbo = require('./database-operations');
var _constList = {
	0: 'Date',
	1: 'Recharge Timer',
	2: 'Columbia Timer',
	3: 'Well Timer',
	4: 'Call For Heat Counter',
}

dbo.LoadDatabase(_constList, () => {
	dbo.AddToDatabase([new Date(), 60, 15, 455, 977]);
});