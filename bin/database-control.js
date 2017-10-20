var dbo = require('./database-operations');

var fileData = dbo.loadDatabase((res) => {
	return res;
});