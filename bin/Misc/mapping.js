

var _outerFunc = module.exports = {
	GetMapping: function() {
		// --Note: if the keys are renamed, other files that use this will have to be changed accordingly.
		return {
			DATE: 'Date',
			WELL_TIMER: 'Well Timer',
			COLUMBIA_TIMER: 'Columbia Timer',
			WELL_RECHARGE_COUNTER: 'Well Counter',
			CFH_COUNTER : 'Call For Heat Counter',
			WELL_RECHARGE_TIMER: 'Well Recharge Timer',
			WELL_SAVINGS: 'Cumulative Well Savings',
			PERCENT_WELL_USED: 'Well Gas Percent Used',
			PERCENT_COLUMBIA_USED: 'Columbia Gas Percent Used'
		}
	}
}