
var _fs = require('fs'),
	_csvWriter = require('csv-write-stream');

const DATA_PATH = __dirname + '/data/';
const ARCHIVE_PATH = DATA_PATH + '/archive/';
const DB_FILE_NAME = 'Data';
const DB_FILE_EXTENSION = '.json';
const DB_FILE_PATH = DATA_PATH + DB_FILE_NAME + DB_FILE_EXTENSION;
const CSV_FILE_NAME = 'Data';
const CSV_FILE_EXTENSION = '.csv'
const CSV_FILE_PATH = DATA_PATH + CSV_FILE_NAME + CSV_FILE_EXTENSION;

var _data;
var _headers;
var _mapping;

module.exports = {
	LoadDatabase: function(mapping, callback) {
		_fs.stat(DB_FILE_PATH, (err, stats) => {
			if (!stats) {
				console.log('Database does not exist, creating..');
				_fs.openSync(DB_FILE_PATH, 'w');
				_fs.openSync(CSV_FILE_PATH, 'w');

				_data = {};
				Object.keys(mapping).forEach((key) => {
					_data[mapping[key]] = [];
				});

				CreateNewCsv();
				module.exports.WriteToDatabase();
				module.exports.WriteToCsv();
				console.log('Created successfully.');
			}
			_data = module.exports.ReadDatabase();
			_headers = Object.keys(_data);
			_mapping = mapping;

			var recentData = module.exports.GetRecentlyLoggedData();

			Object.keys(recentData).forEach((key) => {
				if (recentData[key] == undefined)
					recentData[key] = 0;
			})

			console.log('Loaded successfully.');
			callback(recentData);
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
	
	GetRecentlyLoggedData: function() {
		var recentData = {};
		Object.keys(_data).forEach((key) => {
			recentData[key] = _data[key][_data[key].length - 1];
		});
		return recentData;
	},

	WriteToCsv: function() {
		var csvData = module.exports.GetRecentlyLoggedData();
		module.exports.CsvWriter(csvData, CSV_FILE_PATH, { sendHeaders: false }, { flags: 'a' });
	},

	WriteToDatabase: function() {
		_fs.writeFileSync(DB_FILE_PATH, JSON.stringify(_data, null, '\t'));
	},

	AddToDatabase: function(newData) {
		_data[_headers[0]].push(module.exports.GetCurrentDate().WithTime());
		var keys = Object.keys(newData);
		for (var i = 1; i < keys.length; i++) {
			_data[_headers[i]].push(newData[keys[i]]);
		}
		module.exports.WriteToDatabase();
		_data = module.exports.ReadDatabase();
	},

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
				hour = hour - 12;
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

	ReadDatabase: function() {
		return JSON.parse(_fs.readFileSync(DB_FILE_PATH))
	},
	
	CsvWriter: function(csvData, filePath, csvWriterArgs, writeStreamArgs) {
		var writer = _csvWriter(csvWriterArgs);
		writer.pipe(_fs.createWriteStream(filePath, writeStreamArgs));
		writer.write(csvData);
		writer.end();
	},

	CreateArchives: function() {
		var dataToKeep = module.exports.GetRecentlyLoggedData();
		var date =  module.exports.GetCurrentDate().WithoutTime();
		_fs.unlinkSync(DB_FILE_PATH);
		_fs.renameSync(CSV_FILE_PATH, ARCHIVE_PATH + CSV_FILE_NAME + '-' + date + CSV_FILE_EXTENSION);
		module.exports.LoadDatabase(_mapping, () => {
			module.exports.AddToDatabase(dataToKeep);
			module.exports.WriteToCsv();
		});
	}
}
