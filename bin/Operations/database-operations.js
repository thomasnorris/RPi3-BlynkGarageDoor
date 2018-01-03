
var _fs = require('fs');
var _dto = requireLocal('date-time-operations');

const DATA_PATH = __dirname + '/../Boiler Data/'; // --The /../ moves the folder up into the parent directory
const ARCHIVE_PATH = DATA_PATH + '/Archives/';
const DB_FILE_EXTENSION = '.json';
const CSV_FILE_EXTENSION = '.csv';

var _dbFileName = 'db';
var _dbPathWithName;
var _csvFileName = 'Boiler Data';
var _csvPathWithName;

var _mapping = requireLocal('mapping').GetMapping();
var _data;
var _headers;

(function() {
	// --Checks for Data folders and creates them if empty (i.e. if stats is false)
	_fs.stat(DATA_PATH, (err, stats) => {
		if (!stats) {
			_fs.mkdirSync(DATA_PATH);
			_fs.mkdirSync(ARCHIVE_PATH);
		}
		_fs.stat(ARCHIVE_PATH, (err, stats) => {
			if (!stats)
				_fs.mkdirSync(ARCHIVE_PATH);
		});
	});
})();

var _outerFunc = module.exports = {
	LoadDatabase: function(callback, isTest) {
		if (isTest) {
			_dbFileName += ' TEST';
			_csvFileName += ' TEST';
		}

		_dbPathWithName = DATA_PATH + _dbFileName + DB_FILE_EXTENSION;
		_csvPathWithName = DATA_PATH + _csvFileName + CSV_FILE_EXTENSION;

		_fs.stat(_dbPathWithName, (err, stats) => {
			// --Stats.size will be 0 if there is an empty file
			if (!stats || stats.size === 0) {
				_outerFunc.CreateNewDatabase();
				_outerFunc.WriteToDatabase();

				_fs.stat(_csvPathWithName, (err, stats) => {
					// --Only create a new csv if that is not found either
					if (!stats) {
						var tempHeaders = [];
						var csvData = [];

						_outerFunc.CreateNewEmptyFile(_csvPathWithName);

						Object.keys(_data).forEach((key) => {
							tempHeaders.push(key);
							// --Pushing an empty character because something has to be written on creation
							csvData.push('');
						});

						_outerFunc.WriteToCsv(csvData, _csvPathWithName, { headers: tempHeaders });
					}
				});
			}

			_data = JSON.parse(_fs.readFileSync(_dbPathWithName));
			_headers = Object.keys(_data);

			var data = _outerFunc.GetRecentlyLoggedData();
			Object.keys(data).forEach((key) => {
				// --Will be undefined if a new db was just created
				if (data[key] === undefined)
					data[key] = 0;
			});

			callback(data);
		});
	},

	GetRecentlyLoggedData: function() {
		var recentData = {};

		Object.keys(_data).forEach((key) => {
			recentData[key] = _data[key][_data[key].length - 1];
		});
		
		return recentData;
	},

	AddToCsv: function() {
		var msco = requireLocal('misc-operations');
		var csvData = _outerFunc.GetRecentlyLoggedData();
		console.log(csvData)
		var keys = Object.keys(csvData);
		var unconvertedWellTimerMinutes = csvData[_mapping.WELL_TIMER];
		var unconvertedColumbiaTimerMinuts = csvData[_mapping.COLUMBIA_TIMER];

		var i = 0;
		while (i < keys.length) {
			var key = keys[i];

			// --Only these need to be converted
			if (key === _mapping.WELL_TIMER || key === _mapping.COLUMBIA_TIMER || key === _mapping.WELL_RECHARGE_TIMER) {
				var num = csvData[key];
				if (num !== undefined)
					csvData[key] = _dto.ConvertMinutesToHoursAndMintues(num).PeriodDelimiter();
				i++;
				continue;
			}

			if (key === _mapping.WELL_SAVINGS)
				csvData[key] = msco.ConvertMinutesOfUseToDollarsSaved(unconvertedWellTimerMinutes);

			if (key === _mapping.PERCENT_WELL_USED)
				csvData[key] = msco.GetPercentGasUsed(unconvertedWellTimerMinutes, unconvertedColumbiaTimerMinuts);

			if (key === _mapping.PERCENT_COLUMBIA_USED)
				csvData[key] = msco.GetPercentGasUsed(unconvertedColumbiaTimerMinuts, unconvertedWellTimerMinutes);

			i++;
		}

		_outerFunc.WriteToCsv(csvData, _csvPathWithName, { sendHeaders: false }, { flags: 'a' });
	},

	WriteToCsv: function(csvData, filePath, csvWriterArgs, writeStreamArgs) {
		var writer = require('csv-write-stream')(csvWriterArgs);

		writer.pipe(_fs.createWriteStream(filePath, writeStreamArgs));
		writer.write(csvData);
		writer.end();
	},

	AddToDatabase: function(newData, needDate) {
		var startIndex;
		// --Conditionally add the stored date or get the current date
		if (needDate) {
			_data[_headers[0]].push(_dto.GetCurrentDateAndTime());
			startIndex = 1;
		} else
			startIndex = 0;

		var recentData = _outerFunc.GetRecentlyLoggedData();
		var keys = Object.keys(newData);

		for (var i = startIndex; i < keys.length; i++) {
			// --Only push new data if it is different than previous data
			if (recentData[keys[i]] !== newData[keys[i]])
				_data[_headers[i]].push(newData[keys[i]]);
		}

		_outerFunc.WriteToDatabase();
	},

	WriteToDatabase: function() {
		_fs.writeFileSync(_dbPathWithName, JSON.stringify(_data, null, '\t'));
	},
	
	RefreshDatabase: function() {
		var dataToKeep = _outerFunc.GetRecentlyLoggedData();

		_fs.unlinkSync(_dbPathWithName);
		_outerFunc.CreateNewDatabase();
		_outerFunc.AddToDatabase(dataToKeep);
	},

	CreateNewDatabase: function() {
		_data = {};

		_outerFunc.CreateNewEmptyFile(_dbPathWithName);
		Object.keys(_mapping).forEach((key) => {
			_data[_mapping[key]] = [];
		});
	},
	
	CreateArchives: function(callback) {
		var dataToKeep = _outerFunc.GetRecentlyLoggedData();

		_fs.unlinkSync(_dbPathWithName);
		_fs.renameSync(_csvPathWithName, FormatArchivePath(_csvFileName, CSV_FILE_EXTENSION));

		_outerFunc.LoadDatabase(() => {
			_outerFunc.AddToDatabase(dataToKeep);
			callback();
		});

		function FormatArchivePath(fileName, fileExtension) {
			var date = _dto.GetCurrentMonthAsStringWithYear();
			return ARCHIVE_PATH + fileName + '-' + date + fileExtension;
		}
	},

	ResetSystemToZero: function(callback) {
		_outerFunc.CreateArchives(() => {
			_fs.unlinkSync(_dbPathWithName);
			_outerFunc.LoadDatabase((recentData) => {
				callback(recentData);
			});
		});
	},

	CreateNewEmptyFile: function(filePath) {
		// --Creates a new file and then closes it so it can be accessed right away
		_fs.closeSync(_fs.openSync(filePath, 'w'));
	}
}