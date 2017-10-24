
var _dbo = require('./database-operations');
var _schedule = require('node-schedule');

const DATE = 'Date';
const RECHARGE_COUNTER = 'Recharsdfsdfe Counter';
const COLUMBIA_TIMER = 'Columbia Timer';
const WELL_TIMER = 'Well Timer';
const CFH_COUNTER = 'Call For Heat Counter';

var _mapping = {
	0: DATE,
	1: RECHARGE_COUNTER,
	2: COLUMBIA_TIMER,
	3: WELL_TIMER,
	4: CFH_COUNTER
}

var _newData = [];

_dbo.LoadDatabase(_mapping, (recentData) => {
	_newData = recentData;
});