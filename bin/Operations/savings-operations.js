
var _outerFunc = module.exports = {
	ConvertMinutesOfUseToDollarsSaved: function(min) {
		min = parseInt(min);
		var hours = min / 60;
		var savings = (hours * 0.75 * .98).toFixed(2);
		return '$' + savings;
	}
}