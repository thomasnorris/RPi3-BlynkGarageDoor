
var _fs = require('fs'),
	_csvWriter = require('csv-write-stream');

const DATA_PATH = __dirname + '/data/';
const DB_FILE_NAME = 'Data.json';
const DB_FILE_PATH = DATA_PATH + DB_FILE_NAME;
const CSV_FILE_NAME = 'Data.csv';
const CSV_FILE_PATH = DATA_PATH + CSV_FILE_NAME;

var _data;
var _headers;

module.exports = {
	LoadDatabase: function(mapping, callback) {
		_fs.exists(DB_FILE_PATH, (exists) => {
			if (!exists) {
				console.log('Database does not exist, creating ' + DB_FILE_NAME + ' and ' + CSV_FILE_NAME + '.');
				_fs.openSync(DB_FILE_PATH, 'w');
				_fs.openSync(CSV_FILE_PATH, 'w');

				_data = {};
				Object.keys(mapping).forEach((key) => {
					_data[key] = [];
				});

				CreateNewCsv();
				module.exports.WriteToFiles();
				console.log('Created successfully.');
			}
			_data = module.exports.ReadDataBase();
			_headers = Object.keys(_data);
			console.log(DB_FILE_NAME + ' loaded successfully.')
			callback();
		});

		function CreateNewCsv() {
			var tempHeaders = [];
			var csvData = [];
			Object.keys(_data).forEach((key) => {
				tempHeaders.push(key);
				csvData.push([]);
			});
			module.exports.CsvWriter(csvData, CSV_FILE_PATH, { headers: tempHeaders });
		}
	},

	WriteToFiles: function() {
		_fs.writeFileSync(DB_FILE_PATH, JSON.stringify(_data, null, '\t'));
		var csvData = {};
		Object.keys(_data).forEach((key) => {
			csvData[key] = _data[key][_data[key].length - 1];
		});
		module.exports.CsvWriter(csvData, CSV_FILE_PATH, { sendHeaders: false }, { flags: 'a' });
	},

	AddToDatabase: function(mapping) {
		Object.keys(mapping).forEach((key) => {
			// -TODO: Change Prop to the corrisponding path for the blynk vpin value
			_data[key].push(mapping[key].Prop)
		});
		module.exports.WriteToFiles();
		_data = module.exports.ReadDataBase();
	},

	ReadDataBase: function() {
		return JSON.parse(_fs.readFileSync(DB_FILE_PATH))
	},
	
	CsvWriter: function(csvData, filePath, csvWriterArgs, writeStreamArgs) {
		var writer = _csvWriter(csvWriterArgs);
		writer.pipe(_fs.createWriteStream(filePath, writeStreamArgs));
		writer.write(csvData);
		writer.end();
	}
}
