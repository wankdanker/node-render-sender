render-sender
-------------

A small module that can resize, minify and cache images using:

* imageMagick
* imagemin
* send
* ffmpeg

install
-------

```sh
npm install render-sender
```

example
-------

```js
var rs = require('render-sender')({ cache : '/opt/cache', maxAge : '30 d' });

/*
 ...
 expressish app declared here
 ...

*/

app.get('/images/:file.jpg', function (req, res) {
	rs({
		req : req
		, res : res
		, path : '/opt/images/' + req.params.file + '.jpg'
		, width : 100
		, height : 100
		, format : 'jpg'
	}, function (err) {
		if (err) {
			res.end(err.message);
		}
	});
});
```

api
---

### rs = require('render-sender')(opts);

* opts - [object] an object containing settings for the render-sender instance
	* cache - [string] the path where cached images should be saved
	* maxAge - [string] the maxAge used with the `send` module

### rs(opts)

Render the requested changes to an image and send the response to an http response object.

* opts - [object] an object containing the details of what is currently being requested
	* req - [object] an http server request object
	* res - [object] an http server response object
	* path - [string] the path to an image file to be processed
	* format - [string] the output format of the image
	* width - [numeric] the requested resize width of the image
	* height - [numeric] the requested resize height of the image
	* minify - [boolean] run the output image through a minifier
	* trim - [boolean] make the output image trimmed (remove excess white-space)
	* square - [boolean] make the output image square using the larger of width or height
	* background - [string] when square is true, use this background color to fill in the empty space
	* crop - [object] an object defining the crop section
		* width - [numeric] width of area to cropy
		* height - [numeric] height of area to crop
		* x - [numeric] offset on the x axis for cropping
		* y - [numeric] offset on the y offset for cropping
	* format - [string] the output format requested (jpg,png)
	* stream - [stream/function] a readable stream of binary image data
		* if stream is a function it should return a readable stream when called
		* a file name is still required as part of path for caching
	* outstream - [stream] a writable stream to which the output image should be
	sent 

### rs.maybeRender(opts)

Just render the requested image and save it to the cache dir.

* opts - same as listed above except req and res

license
-------

MIT
