var _csv = require('fast-csv'),
	_fs = require('fs'),
	_fileData;

const FILE_NAME = 'Data.json';
const FILE_PATH = __dirname + '/data/' + FILE_NAME;

module.exports = {
	LoadDatabase: function(_constList, callback) {
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
			callback(module.exports.ReadFromFile());
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
