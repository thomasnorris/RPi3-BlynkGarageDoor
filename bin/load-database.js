
var csv = require('fast-csv'),
	fs = require('fs');

const FILE_NAME = 'Data.json';
const FILE_PATH = __dirname + '/data/' + FILE_NAME;
var _constList = {
	0: 'Date',
	1: 'Recharge Timer',
	2: 'Columbia Timer',
	3: 'Well Timer',
	4: 'Call For Heat Counter'
}

var _data;

fs.exists(FILE_PATH, (exists) => {
	if (!exists) {
		console.log(FILE_NAME + ' does not exist, initializing...');
		fs.openSync(FILE_PATH, 'w');
		InitializeDatabase();
	} 
	_data = JSON.parse(fs.readFileSync(FILE_PATH));
	console.log('Loaded ' + FILE_NAME + ' successfully.');
});

function AddToJson(key, value) {
	_data[key].push(value);
	WriteToFile(_data);
}

function InitializeDatabase() {
	var data = {};
	Object.keys(_constList).forEach((key) => {
		data[_constList[key]] = [];
	});
	WriteToFile(data);
}

function WriteToFile(data) {
	fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, '\t'));
}