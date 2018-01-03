
var _outerFunc = module.exports = {
	GetCurrentDateAndTime: function() {
		var today = new Date();
		var day = today.getDate();
		var month = today.getMonth() + 1;

		if (day < 10)
			day = '0' + day;
		if (month < 10)
			month = '0' + month;

		var date = month + '-' + day + '-' + today.getFullYear();

		var hour = today.getHours();
		var min = today.getMinutes();
		var postfix;

		if (min < 10)
			min = '0' + min;
		if (hour > 12) {
			hour -= 12;
			postfix = 'PM';
		} else if (hour == 12)
			postfix = 'PM';
		else if (hour == 0) {
			hour = 12;
			postfix = 'AM';
		} else
			postfix = 'AM';

		return  date + ' - ' + hour + ':' + min + ' ' + postfix;
	}, 

	GetCurrentMonthAsStringWithYear: function() {
		var monthNames = ["January", "February", "March", "April", "May", "June",
		  "July", "August", "September", "October", "November", "December"
		];
		var date = new Date();
		var year = date.getFullYear();
		var month = date.getMonth() - 1;

		// --If the current month is January, change the previous month to December and go back a year
		if (month === -1) {
			year--;
			month = 11;
		}

		var monthString = monthNames[month];

		return monthString + ' ' + year;
	},

	ConvertMinutesToHoursAndMintues: function(minutes) {
		var h = Math.floor(minutes / 60);
		var m = minutes % 60;

		h = h < 10 ? '0' + h : h;
		m = m < 10 ? '0' + m : m;

		function PeriodDelimiter() {
			return h + '.' + m;
		}

		function PrettyPrint() {
			return h + 'h ' + m + 'm';
		}

		return {
			PeriodDelimiter: PeriodDelimiter,
			PrettyPrint: PrettyPrint
		}
	},
}