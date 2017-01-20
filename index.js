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
	;

module.exports = function (defaults) {
	defaults = defaults || {};

	var cacheDir = resolve(defaults.cache || '/tmp');
	var maxAge = defaults.maxAge || '30 d';

	renderSend.doSend = doSend;
	renderSend.doRender = doRender;
	renderSend.maybeRender = maybeRender;
	renderSend.getCachedPath = getCachedPath;
	renderSend.getCachedName = getCachedName;

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
		opts.format = opts.format || 'jpg';

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
		var cached = opts.cachedPath;

		//if rs is a function then call it and hope that it returns a stream
		if (typeof rs === 'function') {
			rs = rs(opts);
		}

		rs.once('error', cb);

		rs.once('readable', function () {
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

			return g.write(cached, function (err) {
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

		if (opts.format) {
			name = name + '.' + opts.format;
		}

		return name;
	}
}
