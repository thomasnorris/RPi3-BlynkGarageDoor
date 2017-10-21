
var _fs = require('fs'),
	_csvWriter = require('csv-write-stream');

const DATA_PATH = __dirname + '/data/';
const FILE_NAME = 'Data.json';
const FILE_PATH = DATA_PATH + FILE_NAME;
const CSV_NAME = 'Data.csv';
const CSV_PATH = DATA_PATH + CSV_NAME;

module.exports = {
	LoadDatabase: function(constList, callback) {
		_fs.exists(FILE_PATH, (exists) => {
			if (!exists) {
				console.log(FILE_NAME + ' does not exist, initializing...');
				_fs.openSync(FILE_PATH, 'w');
				_fs.openSync(CSV_PATH, 'w');

				var tempData = {};
				Object.keys(constList).forEach((key) => {
					tempData[constList[key]] = [];
				});

				module.exports.WriteToDatabase(tempData);
				CreateNewCsv(tempData);
			}
			callback(module.exports.ReadFromFile());
			console.log('Loaded ' + FILE_NAME + ' successfully.');
		});
		function CreateNewCsv(data) {
			var csvHeaders = [];
			var csvData = [];
			Object.keys(data).forEach((key) => {
				csvHeaders.push(key);
				csvData.push(data[key]);
			});
			var csvWriter = _csvWriter({ headers: csvHeaders })
			csvWriter.pipe(_fs.createWriteStream(CSV_PATH));
			csvWriter.write(csvData);
			csvWriter.end();
		}
	},
	WriteToDatabase: function(data) {
		_fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, '\t'));
	},
	AddToDatabase: function(data, key, value, callback) {
		key.push(value);
		module.exports.WriteToDatabase(data);
		callback(module.exports.ReadFromFile());

	},
	ReadFromFile: function() {
		return JSON.parse(_fs.readFileSync(FILE_PATH))
	}
}
