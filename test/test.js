const rs = require('../')({ cache : __dirname + '/cache' });
const test = require('tape');
const fs = require('fs');
const crypto = require('crypto');

test("Testing an image", function(t) {

	//Variables for the file name and expect sha hash.
	const fileName = "test/cache/77141-Model-500x500-1554300855285-100x100.jpg";
	const expectedHash = "ef18a76f7917a9a7fd0e730147c5300cf4da4646";

	//Call maybeRender with the correct options.
	rs.maybeRender({
		path : "./test/77141-Model-500x500.jpg"
		, width : 100
		, height : 100
		, format : 'jpg'
	}, function (err) {

		//Make sure there isn't an error.
		t.notOk(err, "There should not be an error");

		//Call test equality with the files and the tape object.
		testEquality(fileName, expectedHash, t);

		//End the test.
		t.end();
	});
});


test("Testing a video", function(t) {

	//Variables for the file name and expect sha hash.
	const fileName = "test/cache/10043-Video-1554302883754-bitrate:500.mp4";
	const expectedHash = "1ad1e9b0354c6b2e862393bc99ab8b1cc429a271";

	//Call maybeRender with the correct options.
	rs.maybeRender({
		path : "./test/10043-Video.mp4"
		, format: "mp4"
		, bitrate: 500
	}, function (err) {

		//Make sure there isn't an error.
		t.notOk(err, "There should not be an error");

		//Call test equality with the files and the tape object.
		testEquality(fileName, expectedHash, t);

		//End the test.
		t.end();
	});
});

test("Testing getting a screenshot and timestamp", function(t) {

	//Variables for the file name and expect sha hash.
	const fileName = "test/cache/10043-Video-1554302883754-size:320x240-timestamp:17.jpg";
	const expectedHash = "990450fc686532c26963bf7251924f78dbb08128"

	rs.maybeRender({
		path : "./test/10043-Video.mp4"
		, timestamp : '17'
		, size: "320x240"
		, format: "jpg"
	}, function (err) {
		
		//Make sure there isn't an error.
		t.notOk(err, "There should not be an error");

		//Call test equality with the files and the tape object.
		testEquality(fileName, expectedHash, t);
		
		//End the test.
		t.end();

	});
});


test("Testing converting a video to avi", function(t) {

	//Variables for the file name and expect sha hash.
	const fileName = "test/cache/10043-Video-1554302883754-bitrate:2000.avi";
	const expectedHash = "31d09922742b3350f907bc5fd6113bb45dc0c9c5"

	rs.maybeRender({
		path : "./test/10043-Video.mp4"
		, format: "avi"
		, bitrate: 2000
	}, function (err) {
		
		//Make sure there isn't an error.
		t.notOk(err, "There should not be an error");

		//Call test equality with the files and the tape object.
		testEquality(fileName, expectedHash, t);
		
		//End the test.
		t.end();

	});
});

test("Testing a video with framerate", function(t) {

	//Variables for the file name and expect sha hash.
	const fileName = "test/cache/10043-Video-1554302883754-bitrate:500-framerate:5.mp4";
	const expectedHash = "77b41b55b28a2ae48a03a75578cd68765f751f15"

	rs.maybeRender({
		path : "./test/10043-Video.mp4"
		, format: "mp4"
		, bitrate: 500
		, framerate: 5
	}, function (err) {
		
		//Make sure there isn't an error.
		t.notOk(err, "There should not be an error");

		//Call test equality with the files and the tape object.
		testEquality(fileName, expectedHash, t);
		
		//End the test.
		t.end();

	});
});

test("Testing a video with aspectratio", function(t) {

	//Variables for the file name and expect sha hash.
	const fileName = "test/cache/10043-Video-1554302883754-height:200-aspect_ratio:8x5-bitrate:400.mp4";
	const expectedHash = "6c3a55f0bc0ded59e1faf6a663ce692a997e5b88"

	rs.maybeRender({
		path : "./test/10043-Video.mp4"
		, format: "mp4"
		, bitrate: 400
		, height : 200
		, aspect_ratio: '8x5'
	}, function (err) {
		
		//Make sure there isn't an error.
		t.notOk(err, "There should not be an error");

		//Call test equality with the files and the tape object.
		testEquality(fileName, expectedHash, t);
		
		//End the test.
		t.end();

	});
});


/**
 * This function uses sha hashes to see if a file is exqual to the expected hash.
 * @param {*} file1 name of file1
 * @param {*} file2 name of file2
 * @param {*} t tape testing object.
 */
function testEquality (file1, expectedHash, t) {

	try {

		//Set the algorithm
		let algorithm = 'sha1';

		//Create the shasum;
		let shasum = crypto.createHash(algorithm);

		//Read in the file.
		let file = fs.ReadStream(file1);

		//On data, update the hash.
		file.on('data', resultHash => {
			shasum.update(resultHash);
		});

		//On end, convert the hash into hex and compare the hashes are equal.
		file.on('end', () => {
			let resultHash = shasum.digest('hex');
			t.equal(expectedHash, resultHash, "Hashes are equal");
		});

	} catch(e) {
		console.log("Error:", e.stack);
	}
}