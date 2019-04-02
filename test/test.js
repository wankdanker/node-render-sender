var rs = require('../')({ cache : __dirname + '/cache' });
const test = require('tape');
const fs = require('fs');
const streamEqual = require('stream-equal');


//TODO: Write unit tests.

test("Testing an image", function(t) {

	const testFileName = '77141-Model-500x500.jpg';
	const outputFileName = 'test/cache/77141-Model-500x500-1554212073167-100x100.jpg';
	const correctOutputFileName = 'correct-output-100x100.jpg'

	rs.maybeRender({
		path : testFileName
		, width : 100
		, height : 100
		, format : 'jpg'
	}, function (err, result) {

		try {

			//Create read stream for the files.
			let readStreamOutputFile = fs.createReadStream(outputFileName)
			let readStreamCorrectOutputFile = fs.createReadStream(correctOutputFileName);

			//Check to see if the streams are equal.
			streamEqual(readStreamOutputFile, readStreamCorrectOutputFile, (err, equal) => {
				t.ok(equal, "Files should be the same");
				t.end();
			});

		} catch(e) {
			console.log("Error:", e.stack);
		}
	});
});

//TODO: Finish the test by using streamEqual. See if it works for mp4's.
test("Testing a video", function(t) {

	rs.maybeRender({
		path : "10043-Video.mp4"
		, width : 500
		, height : 500
		, format: "mp4"
	}, function (err, result) {
		

	});

	t.end();
});

//TODO: Finish the test by using streamEqual.
test("Testing getting a screenshot", function(t) {

	rs.maybeRender({
		path : "10043-Video.mp4"
		, width : 500
		, height : 500
		, timeStamp : '00:00:17'
		, format: "jpg"
	}, function (err, result) {
		

	});

	t.end();
});