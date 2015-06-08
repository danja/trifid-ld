/* global log:false */

'use strict';

var
  fs = require('fs'),
  path = require('path'),
  streamBuffers = require("stream-buffers");


require('express-negotiate');


module.exports = function (handler) {
  var
    template = fs.readFileSync(path.join(__dirname, '../data/templates/ld2h.html')).toString(), // danja changed from graph.html
    notFoundPage = fs.readFileSync(path.join(__dirname, '../data/templates/404.html')).toString();
    
 // log.info({script: __filename}, 'template = ' + template);

  var handlerGetRequest = function (iri, mimetype) {
    return new Promise(function (resolve, reject) {
      var contentBuffer = new streamBuffers.WritableStreamBuffer();

      contentBuffer.setHeader = function () {};
      contentBuffer.writeHead = function (statusCode) { this.statusCode = statusCode; };

      contentBuffer.on('close', function () {
        if (contentBuffer.statusCode === 404) {
          resolve(null);
        } else {
          resolve(contentBuffer.getContents().toString());
        }
      });

      contentBuffer.on('error', function () {
        reject();
      });

      handler.get(
        {headers: {accept: mimetype}},
        contentBuffer,
        function () { resolve(null); },
        iri);
    });
  };

  return function (req, res, next) {
    req.negotiate({
      'html': function() {
        var
          iri = req.absoluteUrl();

        if (req.method === 'GET') {
          log.info({script: __filename}, 'handle GET request for IRI <' + iri + '>');

          handlerGetRequest(iri, 'text/turtle') // danja changed from application/ld+json
            .then(function (content) {
              log.info({script: __filename}, 'handle GET content=' + content);
            //  if (content == null || Object.keys(JSON.parse(content)).length === 0) {
              if (content == null || content.length === 0) {
                res.writeHead(404);
                res.end(notFoundPage);
              } else {
                // we have already the content, so let's inject it to avoid another round trip
                var body = template.replace('{{graph}}', content);

                res.end(body);
              }
            })
            .catch(function (err) {
             // res.writeHead(500);
              res.writeHead(500, {"Content-Type": "text/plain"});
              res.write(err + "\n");
              res.end();
            });
        } else {
          next();
        }
      },
      'default': function () {
        next();
      }
    });
  };
};
