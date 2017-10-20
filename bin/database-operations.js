var _csv = require('fast-csv'),
	_fs = require('fs'),
	_fileData;

const FILE_NAME = 'Data.json';
const FILE_PATH = __dirname + '/data/' + FILE_NAME;
var _constList = {
	0: 'Date',
	1: 'Recharge Timer',
	2: 'Columbia Timer',
	3: 'Well Timer',
	4: 'Call For Heat Counter'
}

module.exports = {
	loadDatabase: function(res, err) {
		_fs.exists(FILE_PATH, (exists) => {
			if (!exists) {
				console.log(FILE_NAME + ' does not exist, initializing...');
				_fs.openSync(FILE_PATH, 'w');
				var tempData = {};
				Object.keys(_constList).forEach((key) => {
					tempData[_constList[key]] = [];
				});
				module.exports.WriteToFile(tempData);
			}
			console.log('Loaded ' + FILE_NAME + ' successfully.');
			res(JSON.parse(_fs.readFileSync(FILE_PATH)));
		});
	},
	WriteToFile: function(tempData) {
		_fs.writeFileSync(FILE_PATH, JSON.stringify(tempData, null, '\t'));
	},
	AddToJson: function(tempData, key, value) {
		data[key].push(value);
		module.exports.WriteToFile(data);
	}
}
