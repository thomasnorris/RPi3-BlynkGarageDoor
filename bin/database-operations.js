
var _fs = require('fs');

const DATA_PATH = __dirname + '/data/';
const FILE_NAME = 'Data.json';
const FILE_PATH = DATA_PATH + FILE_NAME;

module.exports = {
	LoadDatabase: function(constList, callback) {
		_fs.exists(FILE_PATH, (exists) => {
			if (!exists) {
				console.log(FILE_NAME + ' does not exist, initializing...');
				_fs.openSync(FILE_PATH, 'w');

				var tempData = {};
				Object.keys(constList).forEach((key) => {
					tempData[constList[key]] = [];
				});

				module.exports.WriteToFile(tempData);
			}
			callback(module.exports.ReadFromFile());
			console.log('Loaded ' + FILE_NAME + ' successfully.');
		});
	},
	WriteToFile: function(data) {
		_fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, '\t'));
	},
	AddToDatabase: function(data, key, value, callback) {
		key.push(value);
		module.exports.WriteToFile(data);
		callback(module.exports.ReadFromFile());

	},
	ReadFromFile: function() {
		return JSON.parse(_fs.readFileSync(FILE_PATH))
	}
}
