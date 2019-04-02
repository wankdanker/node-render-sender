"use strict";

var gm = require('gm')
	, fs = require('fs')
	, join = require('path').join
	, basename = require('path').basename
	, extname = require('path').extname
	, resolve = require('path').resolve
	, send = require('send')
	, Imagemin = require('imagemin')
	, debug = require('debug')('render-sender')
	, ffmpeg = require('fluent-ffmpeg')
	, makeDir = require('make-dir')
	;

module.exports = function (defaults) {
	defaults = defaults || {};

	var cacheDir = resolve(defaults.cache || '/tmp');
	var maxAge = defaults.maxAge || '30 d';
	const imgArray = ["jpg", "jpeg", "tif", "png", "gif", "raw"];
	const videoArray = ["mp4"];

	//Create a cached dir
	(async () => {
		const path = await makeDir('test/cache');
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
		if (!opts.req || !opts.res) {
			return cb(new Error('req and res are required to send.'));
		}

		var crs = send(opts.req, opts.cachedPath, { maxAge : maxAge });

		crs.on('error', cb);
		crs.pipe(opts.res);

		return cb(null, crs);
	}

	function doRender(opts, cb) {
		var rs = opts.stream || fs.createReadStream(opts.path);

		//console.log(opts);

		//if rs is a function then call it and hope that it returns a stream
		if (typeof rs === 'function') {
			rs = rs(opts);
		}

		rs.once('error', cb);

		rs.once('readable', function () {

			//Regular expression for getting the file extension.
			const format = /\.([a-zA-Z1-9]+)$/;
			
			//Exectue the regular express
			const results = format.exec(opts.name + opts.ext);

			//If the file has an extension that is in the image array.
			if(imgArray.includes(results[1])) {

				//Call image render with the apporiate options.
				imageRender(opts, rs, cb);
			}
			//If the file has an extension that is in the image array.
			else if (videoArray.includes(results[1])) {

				//Call video render with the apporiate options.
				videoRender(opts, rs, cb);
			}
			else {

				//Return an error because the file is not supported.
				return cb(new Error(results[0] + " file type is no supported"));
			}

		});
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

		if (opts.aspectRatio) {
			name = name + '-aspect_raito:' + opts.aspectRatio;
		}
		if (opts.bitRate) {
			name = name + '-bit_rate:' + opts.bitRate;
		}
		if (opts.frameRate) {
			name = name + '-frame_rate' + opts.frameRate;
		}
		if (opts.timeStamp) {
			name = name + 'time_stamp:' + opts.timeStamp;
		}

		if (opts.format) {
			name = name + '.' + opts.format;
		}

		return name;
	}

	//This function handles rendering images using gm.
	function imageRender (opts, rs, cb) {

		var g = gm(rs, opts.name)
		.options({ imageMagick : true })

		if (opts.crop) {
			g.crop(opts.crop.width, opts.crop.height, opts.crop.x, opts.crop.y);
		}

		if (opts.width && opts.height) {
			g.resize(opts.width, opts.height);
		}

		if (opts.trim) {
			g.trim();
		}

		return g.write(opts.cachedPath, function (err) {
			if (err) {
				return cb(err);
			}

			if (!opts.minify) {
				return cb();
			}

			(new Imagemin())
				.src(cached)
				.dest(cacheDir)
				.run(function (err, files, stream) {
					if (err) {
						return cb(err);
					}

					return cb();
				});
		});
	}

	//This function renders video using ffmpeg.
	function videoRender (opts, rs, cb) {
		
		//If the output is a image save the desired timestamp.
		if(imgArray.includes(opts.format) && opts.timeStamp) {

			//Main ffmpeg command for the file.
			let command = ffmpeg(opts.name + opts.ext);

			//Get the screenshot.
			command.screenshot({
				timestamps: [opts.timeStamp]
				, filename : opts.cachedName
				, folder: opts.cachedPath.split("/" + opts.cachedName)[0]
			});
		}
		//Process the video.
		else {

			//Main ffmpeg command for the file.
			let command = ffmpeg(opts.name + opts.ext);

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
			if(opts.bitRate) {
				command.videoBitrate(opts.bitRate);
			}
			if(opts.frameRate) {
				command.outputFps(opts.frameRate);
			}
	
			//Add an error handler.
			command.on('error', err => {
				return(cb(err));
			});
			
			//Save the video.
			command.save(opts.cachedPath);

		}
	}
}
