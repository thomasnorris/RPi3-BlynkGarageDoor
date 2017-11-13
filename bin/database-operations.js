
var _fs = require('fs');
var _csvWriter = require('csv-write-stream');
var _dto = require('./date-time-operations');

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
			// --Stats will be false if no file found, stats.size will be 0 if there is an empty file
			if (!stats || stats.size === 0) {
				_outerFunc.CreateNewEmptyFile(_dbPathWithName);
				_outerFunc.CreateNewDatabase(_mapping);
				_outerFunc.WriteToDatabase();

				_fs.stat(_csvPathWithName, (err, stats) => {
					// --Only create a new csv if that is not found either
					if (!stats) {
						_outerFunc.CreateNewEmptyFile(_csvPathWithName);
						var tempHeaders = [];
						var csvData = [];
						Object.keys(_data).forEach((key) => {
							tempHeaders.push(key);
							// --Pushing an empty character because something has to be written on creation
							csvData.push('');
						});
						_outerFunc.WriteToCsv(csvData, _csvPathWithName, { headers: tempHeaders });
					}
				});
			}

			_data = _outerFunc.ReadDatabase();
			_headers = Object.keys(_data);

			var recentData = _outerFunc.GetRecentlyLoggedData();
			recentData = _outerFunc.ConvertUndefinedDataToZero(recentData);

			callback(recentData);
		});
	},
	
	ConvertUndefinedDataToZero: function(recentData) {
		Object.keys(recentData).forEach((key) => {
			// --Will be undefined if a new db was just created
			if (recentData[key] === undefined)
				recentData[key] = 0;
		});
		return recentData;
	},

	GetRecentlyLoggedData: function() {
		var recentData = {};
		Object.keys(_data).forEach((key) => {
			recentData[key] = _data[key][_data[key].length - 1];
		});
		return recentData;
	},

	AddToCsv: function() {
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

		_outerFunc.WriteToCsv(csvData, _csvPathWithName, { sendHeaders: false }, { flags: 'a' });
	},

	WriteToCsv: function(csvData, filePath, csvWriterArgs, writeStreamArgs) {
		var writer = _csvWriter(csvWriterArgs);
		writer.pipe(_fs.createWriteStream(filePath, writeStreamArgs));
		writer.write(csvData);
		writer.end();
	},

	AddToDatabase: function(newData, needDate) {
		var startIndex;
		// --Conditionally add the date
		if (needDate) {
			_data[_headers[0]].push(_dto.GetCurrentDate().WithTime());
			startIndex = 1;
		} else
			startIndex = 0;

		var keys = Object.keys(newData);
		for (var i = startIndex; i < keys.length; i++) {
			_data[_headers[i]].push(newData[keys[i]]);
		}
		_outerFunc.WriteToDatabase();
		_data = _outerFunc.ReadDatabase();
	},

	WriteToDatabase: function() {
		_fs.writeFileSync(_dbPathWithName, JSON.stringify(_data, null, '\t'));
	},

	ReadDatabase: function() {
		return JSON.parse(_fs.readFileSync(_dbPathWithName));
	},
	
	RefreshDatabase: function() {
		var dataToKeep = _outerFunc.GetRecentlyLoggedData();
		_fs.unlinkSync(_dbPathWithName);

		_outerFunc.CreateNewEmptyFile(_dbPathWithName);
		_outerFunc.CreateNewDatabase(_mapping);
		_outerFunc.AddToDatabase(dataToKeep);
	},

	CreateNewDatabase: function() {
		_data = {};
		Object.keys(_mapping).forEach((key) => {
			_data[_mapping[key]] = [];
		});
	},
	
	CreateArchives: function() {
		var dataToKeep = _outerFunc.GetRecentlyLoggedData();
		_fs.unlinkSync(_dbPathWithName);
		
		_fs.renameSync(_csvPathWithName, FormatArchivePath(_csvFileName, CSV_FILE_EXTENSION));

		_outerFunc.LoadDatabase(_mapping, () => {
			_outerFunc.AddToDatabase(dataToKeep);
		});

		function FormatArchivePath(fileName, fileExtension) {
			var date = _dto.GetCurrentDate().WithoutTime();
			return ARCHIVE_PATH + fileName + '-' + date + fileExtension;
		}
	},

	ResetSystemToZero: function() {
		_outerFunc.CreateArchives();
		_fs.unlinkSync(_dbPathWithName);
		_outerFunc.CreateNewEmptyFile(_dbPathWithName);
		_outerFunc.CreateNewDatabase(_mapping);

	},

	CreateNewEmptyFile: function(filePath) {
		// --Creates a new file and then closes it so it can be accessed right away
		_fs.closeSync(_fs.openSync(filePath, 'w'));
	}
}