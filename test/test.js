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
	const fileName = "test/cache/10043-Video-1554302883754-bit_rate:500.mp4";
	const expectedHash = "1ad1e9b0354c6b2e862393bc99ab8b1cc429a271";

	//Call maybeRender with the correct options.
	rs.maybeRender({
		path : "./test/10043-Video.mp4"
		, format: "mp4"
		, bitRate: 500
	}, function (err) {

		//Make sure there isn't an error.
		t.notOk(err, "There should not be an error");

		//Call test equality with the files and the tape object.
		testEquality(fileName, expectedHash, t);

		//End the test.
		t.end();
	});
});

test("Testing getting a screenshot", function(t) {

	//Variables for the file name and expect sha hash.
	const fileName = "test/cache/10043-Video-1554302883754-500x500time_stamp:00:00:17.jpg";
	const expectedHash = "183b1b2cf90cfb10bcd6b9e74293241d3a75c859"

	rs.maybeRender({
		path : "./test/10043-Video.mp4"
		, width : 500
		, height : 500
		, timeStamp : '00:00:17'
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
	const fileName = "test/cache/10043-Video-1554302883754-bit_rate:500.avi";
	const expectedHash = "4f8b7382d0e7fd6c9f1975ebe8ef82c68e993766"

	rs.maybeRender({
		path : "./test/10043-Video.mp4"
		, format: "avi"
		, bitRate: 500
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