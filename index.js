"use strict";

var gm = require('gm')
	, fs = require('fs')
	, join = require('path').join
	, basename = require('path').basename
	, extname = require('path').extname
	, resolve = require('path').resolve
	, send = require('send')
	, imagemin = require('imagemin')
	, jpegtran = require('imagemin-jpegtran')
	, optipng = require('imagemin-optipng')
	, gifsicle = require('imagemin-gifsicle')
	, svgo = require('imagemin-svgo')
	, debug = require('debug')('render-sender')
	, ffmpeg = require('fluent-ffmpeg')
	, makeDir = require('make-dir')
	, getStream = require('get-stream')
	;

module.exports = function (defaults) {
	defaults = defaults || {};

	var cacheDir = resolve(defaults.cache || '/tmp');
	var maxAge = defaults.maxAge || '30 d';
	const imgArray = [
		"jpg", "jpeg", "tif", "png", "gif", "raw"
		, ".jpg", ".jpeg", ".tif", ".png", ".gif", ".raw"
	];
	const videoArray = [
		"mp4"
		, ".mp4"
	];

	//Create a cached dir
	(async () => {
		const path = await makeDir(cacheDir);
	})();

	renderSend.doSend = doSend;
	renderSend.doRender = doRender;
	renderSend.maybeRender = maybeRender;
	renderSend.getCachedPath = getCachedPath;
	renderSend.getCachedName = getCachedName;
	renderSend.imageRender = imageRender;
	renderSend.videoRender = videoRender;

	return renderSend;

	// This function will serve a cached image or render the new image, save it and send it
	function renderSend (opts, cb) {
		opts = opts || {};

		//If there is a height and weight.
		if(opts.height && opts.width) {
			//Set dimensions to width by height.
			opts.dimensions = opts.width + 'x' + opts.height; 
		}

		maybeRender(opts, function (err, rendered) {
			if (err) {
				return cb(err);
			}

			doSend(opts, cb);
		});
	};

	// This function will render a new image if necessary
	function maybeRender (opts, cb) {
		getCachedPath(opts, function (err, cachedPath) {
			if (err) {
				return cb(err);
			}

			opts.cachedPath = cachedPath;

			//check to see if the cached version exists...
			fs.stat(opts.cachedPath, function (err, stat) {
				//cache does not exist
				if (err) {
					return doRender(opts, function (err) {
						if (err) {
							return cb(err);
						}

						//we needed to render
						return cb(null, true);
					});
				}

				//we didn't need to render
				return cb(null, false);
			});
		});
	}

	function doSend (opts, cb) {
		debug('sending for %s:', opts.path);

		if (opts.outstream) {
			return doSendFs(opts, cb);
		}

		if (opts.req && opts.res) {
			return doSendHttp(opts, cb);
		}

		return cb(new Error('opts.req and opts.res or opts.outstream are required to send.'));
	}

	function doSendFs (opts, cb) {
		var readStream = fs.createReadStream(opts.cachedPath);

		readStream.pipe(opts.outstream);

		readStream.on('end', cb)
		readStream.on('error', cb)
	}

	function doSendHttp (opts, cb) {
		if (!opts.req || !opts.res) {
			return cb(new Error('req and res are required to send.'));
		}

		var crs = send(opts.req, opts.cachedPath, { maxAge : maxAge });

		crs.on('error', cb);
		crs.pipe(opts.res);

		return cb(null, crs);
	}

	function doRender(opts, cb) {
		debug('rendering for %s:', opts.path);

		var rs = opts.stream || fs.createReadStream(opts.path);

		//if rs is a function then call it and hope that it returns a stream
		if (typeof rs === 'function') {
			rs = rs(opts);
		}

		rs.once('error', closeStream);

		rs.once('readable', function () {
			//If the file has an extension that is in the image array
			//or if there is no extension, then we assume it's an image
			if(!opts.ext || imgArray.includes(opts.ext)) {

				//Call image render with the appropriate options.
				imageRender(opts, rs, closeStream);
			}
			//If the file has an extension that is in the image array.
			else if (videoArray.includes(opts.ext)) {

				//Call video render with the appropriate options.
				videoRender(opts, rs, closeStream);
			}
			else {

				//Return an error because the file is not supported.
				return closeStream(new Error(opts.ext + " file type is not supported"));
			}

		});

		/**
		 * This function handles closing the read stream before invoking the callback function.
		 * @returns invoking the call back function with the args.
		 */
		function closeStream () {

			//Retrieve the arguments.
			var args = Array.prototype.slice.call(arguments);

			try {

				//Close the read stream.
				rs.close();
			}
			catch (e) {

				//Log the err.
				console.error("Read stream could not be closed.", e);
			}

			//Return the callback with the arguments.
			return cb.apply(null, args);
		}
	}

	function getCachedPath(opts, cb) {
		if (opts.stream) {
			opts.cachedName = getCachedName(opts);

			return cb(null, join(cacheDir, opts.cachedName));
		}

		fs.stat(opts.path, function (err, stat) {
			if (err) {
				return cb(err);
			}

			opts.stat = stat;
			opts.cachedName = getCachedName(opts);

			return cb(null, join(cacheDir, opts.cachedName));
		});
	}

	function getCachedName(opts) {
		var path = opts.path
			, ext = extname(path)
			, name = basename(path, ext)
			;

		opts.ext = ext;
		opts.name = name;

		if (opts.stat) {
			name = name + '-' + opts.stat.mtime.getTime()
		}

		if (opts.width && opts.height) {
			name = name + '-' + opts.width + 'x' + opts.height;
		} else if (opts.width) {
			name = name + "-width:" + opts.width;
		} else if (opts.height) {
			name = name + "-height:" + opts.height;
		}

		if (opts.trim) {
			name = name + '-trimmed';
		}

		if (opts.minify) {
			name = name + '-minified';
		}

		if (opts.crop) {
			name = name + '-cropped:' + opts.crop.width + 'x' + opts.crop.height + '~' + opts.crop.x + ',' + opts.crop.y
		}

		if (opts.aspect_ratio) {
			name = name + '-aspect_ratio:' + opts.aspect_ratio;
		}
		if (opts.bitrate) {
			name = name + '-bitrate:' + opts.bitrate;
		}
		if (opts.framerate) {
			name = name + '-framerate:' + opts.framerate;
		}
		if (opts.timestamp) {
			name = name + '-timestamp:' + opts.timestamp;
		}

		if (opts.format) {
			name = name + '.' + opts.format;
		}

		return name;
	}

	//This function handles rendering images using gm.
	async function imageRender (opts, rs, cb) {
		var cached = opts.cachedPath;

		//ugh, we need to do stuff on this stream twice, 
		//so I have to store it as a buffer until something
		//better strikes me.
		//TODO: only do this if opts.crop is true
		var buffer = await getStream.buffer(rs);

		var size = await new Promise(function (resolve, reject) {
			gm(buffer).size(pcb(resolve, reject));
		});

		var g = gm(buffer, opts.name)
			.options({ imageMagick : true })

		if (opts.crop) {
			if (opts.crop.width < 1) {
				opts.crop.width = Math.round(size.width * opts.crop.width);
			}

			if (opts.crop.height < 1) {
				opts.crop.height = Math.round(size.height * opts.crop.height);
			}

			if (opts.crop.x < 1) {
				opts.crop.x = Math.round(size.width * opts.crop.x);
			}

			if (opts.crop.y < 1) {
				opts.crop.y = Math.round(size.height * opts.crop.y);
			}
			
			g.crop(opts.crop.width, opts.crop.height, opts.crop.x, opts.crop.y);
		}

		if (opts.width && opts.height) {
			g.resize(opts.width, opts.height);
		}

		if (opts.trim) {
			g.trim();
		}

		return g.write(opts.cachedPath, async function (err) {
			if (err) {
				return cb(err);
			}

			if (!opts.minify) {
				return cb();
			}

			try {
				await imagemin([cached], cacheDir, {
					use : [
						jpegtran()
						, optipng()
						, gifsicle()
						, svgo()
					]
				});
			}
			catch (err) {
				return cb(err);
			}

			return cb();
		});
	}

	//This function renders video using ffmpeg.
	function videoRender (opts, rs, cb) {
		
		//If the output is a image save the desired timestamp.
		if(imgArray.includes(opts.format) && opts.timestamp) {

			//Main ffmpeg command for the file.
			let command = ffmpeg(opts.path);
	
			//Screent shot opts.
			let screenshotOpts = {
				timestamps: [opts.timestamp]
				, filename : opts.cachedName
				, folder: opts.cachedPath.split("/" + opts.cachedName)[0]
			}
			
			//If there are dimensions.
			if (opts.dimensions) {
				//Add size to screenshot opts equal to the dimensions.
				screenshotOpts.size = opts.dimensions;
			}

			//Get the screenshot.
			command.screenshot(screenshotOpts);

			//And an ender handler.
			command.on('end', err => {
				return cb();
			});
		}
		//Process the video.
		else {

			//Main ffmpeg command for the file.
			let command = ffmpeg(opts.path);

			//Set the opts for the video if they exist.

			//Size of the video based on the opts.
			let sizeString;
			
			if(opts.height && !opts.width) {
				sizeString = '?x' + opts.height;
			}
			else if(opts.width && !opts.height) {
				sizeString = opts.width + 'x?';
			}
			else {
				sizeString = opts.width + "x" + opts.height;
			}

			if(opts.height || opts.width) {
				command.size(sizeString);
			}
			if(opts.bitrate) {
				command.videoBitrate(opts.bitrate);
			}
			if(opts.framerate) {
				command.fps(opts.framerate);
			}
			if(opts.aspect_ratio && (opts.width || opts.height)) {
				let numbers = opts.aspect_ratio.split("x");
				command.size(sizeString).aspect(numbers[0] + ":" + numbers[1]);
			}

			//Save the video.
			command.save(opts.cachedPath);

			//Add an error handler.
			command.on('error', err => {
				return(cb(err));
			});

			//Add an end handler.
			command.on('end', err => {
				return cb();
			});



		}
	}
}

//promised callback
function pcb(resolve, reject) {
	return function (err, data) {
		if (err) {
			return reject(err);
		}

		return resolve(data);
	}
}