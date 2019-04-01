var rs = require('../')({ cache : __dirname + '/cache' });
const test = require('tape');

rs({
	path : 'd7a64b8b3176471083b47f9b59c43f71.jpg'
	, width : 100
	, height : 100
	, format : 'png'
}, function (err, result) {
	console.log(arguments);
});

//TODO: Write unit tests.

test("test", function(t) {
	t.end();
});