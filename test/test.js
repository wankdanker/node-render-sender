const rs = require('../')({ cache : __dirname + '/cache' });
const test = require('tape');
const fs = require('fs');
const crypto = require('crypto');
const through = require('through');

test("Testing an image", function(t) {
	t.plan(2);

	//Variables for the file name and expect sha hash.
	const expectedHash = "ef18a76f7917a9a7fd0e730147c5300cf4da4646";
	const outstream = passthrough();

	//Call test equality with the files and the tape object.
	testEquality(outstream, expectedHash, t);

	//Call maybeRender with the correct options.
	rs({
		path : "./test/77141-Model-500x500.jpg"
		, width : 100
		, height : 100
		, format : 'jpg'
		, outstream : outstream
	}, function (err) {
		//Make sure there isn't an error.
		t.notOk(err, "There should not be an error");
		t.end();
	});
});


test("Testing a video", function(t) {
	t.plan(2);

	//Variables for the file name and expect sha hash.
	const expectedHash = "f66204516e34cc27ef2b114e45a24578ebb071e6";
	const outstream = passthrough();

	//Call test equality with the files and the tape object.
	testEquality(outstream, expectedHash, t);

	//Call maybeRender with the correct options.
	rs({
		path : "./test/10043-Video.mp4"
		, format: "mp4"
		, bitrate: 500
		, outstream : outstream
	}, function (err) {
		//Make sure there isn't an error.
		t.notOk(err, "There should not be an error");

		//End the test.
		t.end();
	});
});

test("Testing getting a screenshot and timestamp", function(t) {
	t.plan(2);

	//Variables for the file name and expect sha hash.
	const expectedHash = "990450fc686532c26963bf7251924f78dbb08128";
	const outstream = passthrough();

	//Call test equality with the files and the tape object.
	testEquality(outstream, expectedHash, t);

	rs({
		path : "./test/10043-Video.mp4"
		, timestamp : '17'
		, size: "320x240"
		, format: "jpg"
		, outstream : outstream
	}, function (err) {
		//Make sure there isn't an error.
		t.notOk(err, "There should not be an error");
		
		//End the test.
		t.end();
	});
});

test("Testing converting a video to avi", function(t) {
	t.plan(2);

	//Variables for the file name and expect sha hash.
	const expectedHash = "fa75abacb6e97296f4753c4c0f295e8d3a66d632";
	const outstream = passthrough();

	//Call test equality with the files and the tape object.
	testEquality(outstream, expectedHash, t);

	rs({
		path : "./test/10043-Video.mp4"
		, format: "avi"
		, bitrate: 2000
		, outstream : outstream
	}, function (err) {
		//Make sure there isn't an error.
		t.notOk(err, "There should not be an error");

		//End the test.
		t.end();
	});
});

test("Testing a video with framerate", function(t) {
	t.plan(2);

	//Variables for the file name and expect sha hash.
	const expectedHash = "6a9486bdf2410238a59757429fc31bec8690baab";
	const outstream = passthrough();

	//Call test equality with the files and the tape object.
	testEquality(outstream, expectedHash, t);

	rs({
		path : "./test/10043-Video.mp4"
		, format: "mp4"
		, bitrate: 500
		, framerate: 5
		, outstream : outstream
	}, function (err) {
		//Make sure there isn't an error.
		t.notOk(err, "There should not be an error");

		//End the test.
		t.end();

	});
});

test("Testing a video with aspectratio", function(t) {
	t.plan(2);

	//Variables for the file name and expect sha hash.
	const expectedHash = "6c3a55f0bc0ded59e1faf6a663ce692a997e5b88";
	const outstream = passthrough();

	//Call test equality with the files and the tape object.
	testEquality(outstream, expectedHash, t);

	rs({
		path : "./test/10043-Video.mp4"
		, format: "mp4"
		, bitrate: 400
		, height : 200
		, aspect_ratio: '8x5'
		, outstream : outstream
	}, function (err) {
		//Make sure there isn't an error.
		t.notOk(err, "There should not be an error");
		
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
function testEquality (stream, expectedHash, t) {

	try {

		//Set the algorithm
		let algorithm = 'sha1';

		//Create the shasum;
		let shasum = crypto.createHash(algorithm);

		//On data, update the hash.
		stream.on('data', resultHash => {
			shasum.update(resultHash);
		});

		//On end, convert the hash into hex and compare the hashes are equal.
		stream.on('end', () => {
			let resultHash = shasum.digest('hex');
			t.equal(resultHash, expectedHash, "Hashes are equal");
		});

	} catch(e) {
		console.log("Error:", e.stack);
	}
}

function passthrough() {
	return through(function write(data) {
		this.queue(data);
	}, function end () {
		this.queue(null)
	})
}