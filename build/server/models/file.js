// Generated by CoffeeScript 1.11.1
var Binary, File, americano, fs, log, mimetype, moment, request;

fs = require('fs');

americano = require('cozydb');

request = require('request');

moment = require('moment');

mimetype = require('mimetype');

Binary = require('./binary');

log = require('printit')({
  prefix: 'konnectors'
});

module.exports = File = americano.getModel('File', {
  path: String,
  name: String,
  creationDate: String,
  lastModification: String,
  "class": String,
  mime: String,
  size: Number,
  binary: Object,
  modificationHistory: Object,
  clearance: [Object],
  tags: [String]
});

File.all = function(params, callback) {
  return File.request("all", params, callback);
};

File.byFolder = function(params, callback) {
  return File.request("byFolder", params, callback);
};

File.byFullPath = function(params, callback) {
  return File.request("byFullPath", params, callback);
};

File.isPresent = function(fullPath, callback) {
  return File.request("byFullPath", {
    key: fullPath
  }, function(err, files) {
    if (err) {
      return callback(err);
    }
    return callback(null, (files != null) && files.length > 0);
  });
};

File.createNew = function(fileName, path, url, tags, callback) {
  var attachBinary, clearTmpFile, data, filePath, getFileClass, mime, now, options, stream;
  now = moment().toISOString();
  filePath = "/tmp/" + fileName;
  mime = mimetype.lookup(fileName) || 'application/pdf';
  getFileClass = function(type) {
    var fileClass;
    switch (type.split('/')[0]) {
      case 'image':
        fileClass = "image";
        break;
      case 'application':
        fileClass = "document";
        break;
      case 'text':
        fileClass = "document";
        break;
      case 'audio':
        fileClass = "music";
        break;
      case 'video':
        fileClass = "video";
        break;
      default:
        fileClass = "file";
    }
    return fileClass;
  };
  data = {
    name: fileName,
    path: path,
    creationDate: now,
    lastModification: now,
    tags: tags,
    "class": getFileClass(mime),
    mime: mime
  };
  clearTmpFile = function(cb) {
    log.info("Deleting file: " + filePath);
    return fs.unlink(filePath, function(err) {
      if (err != null) {
        log.error(err);
      }
      return cb(err);
    });
  };
  attachBinary = function(newFile) {
    return newFile.attachBinary(filePath, {
      "name": "file"
    }, function(err) {
      if (err) {
        log.error(err);
        return callback(err);
      } else {
        return clearTmpFile(function(err) {
          if (err != null) {
            callback(err, null);
          }
          return File.find(newFile.id, function(err, file) {
            return callback(err, file);
          });
        });
      }
    });
  };
  options = {
    uri: url,
    method: 'GET',
    jar: true
  };
  log.info("Downloading file at " + url + "...");
  stream = request(options, function(err, res, body) {
    var stats;
    if (err != null) {
      log.error(err);
      clearTmpFile(function() {
        return callback(err, null);
      });
    }
    if ((res != null ? res.statusCode : void 0) === 200) {
      try {
        stats = fs.statSync(filePath);
        data.size = stats["size"];
        log.info("File at " + url + " downloaded.");
        return File.create(data, function(err, newFile) {
          if (err) {
            log.error(err);
            return callback(err);
          } else {
            return attachBinary(newFile);
          }
        });
      } catch (error) {
        err = error;
        log.error(err);
        return clearTmpFile(function() {
          return callback(err, null);
        });
      }
    } else {
      log.error("Wrong url: " + url);
      if (res != null) {
        log.error(res.statusCode, res.body);
      }
      return clearTmpFile(function() {
        return callback('wrong url', null);
      });
    }
  });
  return stream.pipe(fs.createWriteStream(filePath));
};

File.prototype.destroyWithBinary = function(callback) {
  var binary;
  if (this.binary != null) {
    binary = new Binary(this.binary.file);
    return binary.destroy((function(_this) {
      return function(err) {
        if (err) {
          log.error("Cannot destroy binary linked to document " + _this.id);
        }
        return _this.destroy(callback);
      };
    })(this));
  } else {
    return this.destroy(callback);
  }
};
