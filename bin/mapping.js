

var _outerFunc = module.exports = {
	GetMapping: function() {
		// --Note: if the keys are renamed, go to database-operations.js and make sure that the names
		// in WriteToCsv() are changed to match
		var mapping = {
			DATE: 'Date',
			WELL_TIMER: 'Well Timer',
			COLUMBIA_TIMER: 'Columbia Timer',
			WELL_RECHARGE_COUNTER: 'Well Counter',
			CFH_COUNTER : 'Call For Heat Counter',
			WELL_RECHARGE_TIMER: 'Well Recharge Timer'
		}

		return mapping;
	}
}