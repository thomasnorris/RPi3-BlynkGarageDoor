
var _fs = require('fs'),
	_csvWriter = require('csv-write-stream'),
	_dto = require('./date-time-operations');

const DATA_PATH = __dirname + '/data/';
const ARCHIVE_PATH = DATA_PATH + '/archive/';
const DB_FILE_EXTENSION = '.json';
const CSV_FILE_EXTENSION = '.csv'

var _dbFileName = 'Data';
var _dbPathWithName;
var _csvFileName = 'Data';
var _csvPathWithName;

var _data;
var _headers;
var _mapping;

module.exports = {
	LoadDatabase: function(mapping, callback, isTest) {
		if (isTest) {
			_dbFileName += '-Test';
			_csvFileName += '-Test';
		}
		_dbPathWithName = DATA_PATH + _dbFileName + DB_FILE_EXTENSION;
		_csvPathWithName = DATA_PATH + _csvFileName + CSV_FILE_EXTENSION;

		_fs.stat(_dbPathWithName, (err, stats) => {
			if (!stats) {
				_fs.openSync(_dbPathWithName, 'w');
				_fs.openSync(_csvPathWithName, 'w');

				_data = {};
				Object.keys(mapping).forEach((key) => {
					_data[mapping[key]] = [];
				});

				CreateNewCsv();
				module.exports.WriteToDatabase();
				module.exports.WriteToCsv();
			}
			_data = module.exports.ReadDatabase();
			_headers = Object.keys(_data);
			_mapping = mapping;

			var recentData = module.exports.GetRecentlyLoggedData();

			Object.keys(recentData).forEach((key) => {
				if (recentData[key] == undefined)
					recentData[key] = 0;
			})

			callback(recentData);
		});

		function CreateNewCsv() {
			var tempHeaders = [];
			var csvData = [];
			Object.keys(_data).forEach((key) => {
				tempHeaders.push(key);
				csvData.push([]);
			});
			module.exports.CsvWriter(csvData, _csvPathWithName, { headers: tempHeaders });
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
		var keys = Object.keys(csvData);
		for (var i = 2; i < keys.length - 1; i++) {
			var num = csvData[keys[i]]
			if (num != undefined)
				csvData[keys[i]] = _dto.MinutesAsHoursMins(num);
		}
		module.exports.CsvWriter(csvData, _csvPathWithName, { sendHeaders: false }, { flags: 'a' });
	},

	WriteToDatabase: function() {
		_fs.writeFileSync(_dbPathWithName, JSON.stringify(_data, null, '\t'));
	},

	AddToDatabase: function(newData) {
		_data[_headers[0]].push(_dto.GetCurrentDate().WithTime());
		var keys = Object.keys(newData);
		for (var i = 1; i < keys.length; i++) {
			_data[_headers[i]].push(newData[keys[i]]);
		}
		module.exports.WriteToDatabase();
		_data = module.exports.ReadDatabase();
	},

	ReadDatabase: function() {
		return JSON.parse(_fs.readFileSync(_dbPathWithName))
	},
	
	CsvWriter: function(csvData, filePath, csvWriterArgs, writeStreamArgs) {
		var writer = _csvWriter(csvWriterArgs);
		writer.pipe(_fs.createWriteStream(filePath, writeStreamArgs));
		writer.write(csvData);
		writer.end();
	},

	CreateArchives: function() {
		var dataToKeep = module.exports.GetRecentlyLoggedData();
		var date = _dto.GetCurrentDate().WithoutTime();
		_fs.renameSync(_dbPathWithName, ARCHIVE_PATH + _dbFileName + '-' + date + DB_FILE_EXTENSION);
		_fs.renameSync(_csvPathWithName, ARCHIVE_PATH + _csvFileName + '-' + date + CSV_FILE_EXTENSION);
		module.exports.LoadDatabase(_mapping, () => {
			module.exports.AddToDatabase(dataToKeep);
			module.exports.WriteToCsv();
		});
	}
}
