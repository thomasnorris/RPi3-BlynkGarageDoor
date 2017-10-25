
module.exports = {
	GetCurrentDate: function() {
		var today = new Date();
		var day = today.getDate();
		var month = today.getMonth() + 1;

		if (day < 10)
			day = '0' + day;
		if (month < 10)
			month = '0' + month;

		var date = month + '-' + day + '-' + today.getFullYear();

		function WithTime() {
			var hour = today.getHours();
			var min = today.getMinutes();
			var postfix;

			if (min < 10)
				min = '0' + min;
			if (hour > 12) {
				hour -= 12;
				postfix = 'PM';
			}
			else if (hour == 12) 
				postfix = 'PM';
			else if (hour == 0) {
			  	hour = 12;
			  	postfix = 'AM';
			}
			else
			  postfix = 'AM';

			return  date + ' - ' + hour + ':' + min + ' ' + postfix;
		}

		function WithoutTime() {
			return date;
		}

		return {
			WithTime: WithTime,
			WithoutTime: WithoutTime
		}
	}, 
}