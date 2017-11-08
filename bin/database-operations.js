
var _fs = require('fs');
var	_csvWriter = require('csv-write-stream');
var	_dto = require('./date-time-operations');

const DATA_PATH = __dirname + '/data/';
const ARCHIVE_PATH = DATA_PATH + '/archive/';
const DB_FILE_EXTENSION = '.json';
const CSV_FILE_EXTENSION = '.csv';

var _dbFileName = 'Data';
var _dbPathWithName;
var _csvFileName = 'Data';
var _csvPathWithName;

var _data;
var _headers;
var _mapping;

var _outerFunc = module.exports = {
	LoadDatabase: function(mapping, callback, isTest) {
		_mapping = mapping;

		if (isTest) {
			_dbFileName += '-test';
			_csvFileName += '-test';
		}
		_dbPathWithName = DATA_PATH + _dbFileName + DB_FILE_EXTENSION;
		_csvPathWithName = DATA_PATH + _csvFileName + CSV_FILE_EXTENSION;

		_fs.stat(_dbPathWithName, (err, stats) => {
			// --Stats will be false if the db file is not found, and a new db and csv will be created
			if (!stats) {
				_outerFunc.CreateNewEmptyFile(_dbPathWithName);
				_outerFunc.CreateNewEmptyFile(_csvPathWithName);

				_outerFunc.CreateNewDatabase(_mapping);

				CreateNewCsv();
				_outerFunc.WriteToDatabase();
				_outerFunc.WriteToCsv();
			}

			_data = _outerFunc.ReadDatabase();
			_headers = Object.keys(_data);

			var recentData = _outerFunc.GetRecentlyLoggedData();

			Object.keys(recentData).forEach((key) => {
				// --Will be undefined if from a new CSV and 0 is more friendly
				if (recentData[key] === undefined)
					recentData[key] = 0;
			});

			callback(recentData);
		});

		function CreateNewCsv() {
			var tempHeaders = [];
			var csvData = [];
			Object.keys(_data).forEach((key) => {
				tempHeaders.push(key);
				// --Pushing an empty character because something has to be written on creation
				csvData.push('');
			});
			_outerFunc.CsvWriter(csvData, _csvPathWithName, { headers: tempHeaders });
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
		var csvData = _outerFunc.GetRecentlyLoggedData();
		var keys = Object.keys(csvData);

		// --Only format the sections that require it.
		var i = 0;
		while (i < keys.length) {
			if (keys[i] === _mapping.DATE || keys[i] === _mapping.WELL_RECHARGE_COUNTER || keys[i] === _mapping.CFH_COUNTER) {
				i++;
				continue;
			}
			var num = csvData[keys[i]];
			if (num !== undefined)
				csvData[keys[i]] = _dto.MinutesAsHoursMins(num);
			i++;
		}

		_outerFunc.CsvWriter(csvData, _csvPathWithName, { sendHeaders: false }, { flags: 'a' });
	},

	WriteToDatabase: function() {
		_fs.writeFileSync(_dbPathWithName, JSON.stringify(_data, null, '\t'));
	},

	AddToDatabase: function(newData) {
		_data[_headers[0]].push(_dto.GetCurrentDate().WithTime());
		var keys = Object.keys(newData);
		// --Start at 1 because the 0th index is set above
		for (var i = 1; i < keys.length; i++) {
			_data[_headers[i]].push(newData[keys[i]]);
		}
		_outerFunc.WriteToDatabase();
		_data = _outerFunc.ReadDatabase();
	},

	ReadDatabase: function() {
		return JSON.parse(_fs.readFileSync(_dbPathWithName));
	},
	
	CsvWriter: function(csvData, filePath, csvWriterArgs, writeStreamArgs) {
		var writer = _csvWriter(csvWriterArgs);
		writer.pipe(_fs.createWriteStream(filePath, writeStreamArgs));
		writer.write(csvData);
		writer.end();
	},

	CreateArchives: function() {
		var dataToKeep = _outerFunc.GetRecentlyLoggedData();
		var dbArchivePathWithName = FormatArchivePath(_dbFileName, DB_FILE_EXTENSION);

		_fs.renameSync(_dbPathWithName, dbArchivePathWithName);
		_fs.renameSync(_csvPathWithName, FormatArchivePath(_csvFileName, CSV_FILE_EXTENSION));

		_outerFunc.LoadDatabase(_mapping, () => {
			module.exports.AddToDatabase(dataToKeep);
		});
		
		_fs.unlinkSync(dbArchivePathWithName);

		function FormatArchivePath(fileName, fileExtension) {
			var date = _dto.GetCurrentDate().WithoutTime();
			return ARCHIVE_PATH + fileName + '-' + date + fileExtension;
		}
	},

	RefreshDatabase: function() {
		var dataToKeep = _outerFunc.GetRecentlyLoggedData();
		_fs.unlinkSync(_dbPathWithName);
		
		_outerFunc.CreateNewEmptyFile(_dbPathWithName);
		_outerFunc.CreateNewDatabase(_mapping);
		_outerFunc.AddToDatabase(dataToKeep);
	},

	CreateNewDatabase: function(mapping) {
		_data = {};
		Object.keys(mapping).forEach((key) => {
			_data[mapping[key]] = [];
		});
	},

	CreateNewEmptyFile: function(filePath) {
		_fs.closeSync(_fs.openSync(filePath, 'w'));
	}
}
