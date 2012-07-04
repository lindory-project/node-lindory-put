#!/usr/bin/env node

var fs = require('fs');
var http = require('http');
var path = require('path');
var url = require('url');
var util = require('util');
var url = require('url');
var zlib = require('zlib');

var async = require('async');
var colors = require('colors');
var faker = require('Faker');
var optimist = require('optimist').demand(1);
var prompt = require('prompt');
var __ = require('underscore');

var tl = new (require('../lib/timelogger.js'))();
var env = {}; //FIXME toremove


var optiargs = {
  'u': {
    alias: 'user',
    string: true,
    description: 'User name and password to use for authentication, as: "user:password"' },
  's': {
    alias: 'size',
    default: '100',
    description: 'Size of generated data (number of boxes)' },
  'f': {
    alias: 'force',
    boolean: true,
    description: 'Force generating data' },
  'i': {
    alias: 'input',
    string: true,
    description: 'Load and send the given file, or read from stdin if "_" is supplied '
      + ' (disables -f parameter)' },
  'z': {
    alias: ['gzip', 'gunzip', 'ungzip', 'uncompress'],
    boolean: true,
    description: '' },
  'c': {
    alias: 'clean',
    boolean: true,
    description: 'Clean lindory after bench, by removing container(s)' },
  'C': {
    alias: 'copy',
    description: 'Perform a copy test on the uploaded container' },
  'h': {
    alias: 'help',
    boolean: true }
}

optimist.options(optiargs);
optimist.usage('Usage: $0 [-u user:password] TARGET_URL [OPTIONS]')
var argv = optimist.argv;

/*******************************
 * Process parameters
 */
if (argv.h) {
  console.log(optimist.help());
  return;
}

// Host and port
var targetUrl = url.parse(argv._.pop());
//FIXME check if URL is valid

// User authentication
var userName = "";
var userPass = "";

if (typeof(argv.user) === "string") {
  var userSplit = argv.user.split(':');
  userName = userSplit.shift();
  userPass = userSplit.shift();
}
else {
  userName = "test";
}


// Dataset size
if (argv.s === 'small')   { argv.s = 50; }
if (argv.s === 'medium')  { argv.s = 500; }
if (argv.s === 'big')     { argv.s = 5000; }
argv.s = Number(argv.s);

// Paths
var filePath = "/tmp/linput-data.xml";
if (argv.i) { filePath = argv.i; }

var createString = 'Data generation';
var putString = 'Put request';
var copyString = 'Put copy request';


process.on('SIGINT', function () {
  console.log('\nAborting.'.yellow);
  process.exit(1);
});



/*******************************
 * Password prompt
 */
var promptPassword = function (callback) {
  prompt.start();
  var promptOptions = [{
    name: 'password',
    hidden: true,
    description: 'Password for user "' + userName + '"'
  }];
      
  prompt.get(promptOptions, function (err, result) {
    if (err) {
      callback('Error');
      return;
    }
    userPass = result.password;
    callback();
  });
}


/**
 * DATA GENERATION
 */
var createFakeData = function (callback) {
  tl.start(createString);
  console.log('# Creating fake data');
  
  var file = fs.openSync(filePath, 'w');
  var buffer = "";
 
  fs.writeSync(file, '<?xml version="1.0" encoding="UTF-8"?>' + "\n"
    + '<rdf:RDF xmlns:skos="http://www.w3.org/2004/02/skos/core#"'
    + 'xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">' + "\n");
  
  for (var x = 0; x < argv.s; x++) {
    buffer += "\t" + '<skos:Concept rdf:about="' + x + '">' + "\n";
    buffer += "\t\t" + '<skos:prefLabel xml:lang="fr">' +
        faker.Name.findName() + '</skos:prefLabel>' + "\n";
    buffer += "\t\t" + '<skos:altLabel xml:lang="fr">' +
        faker.Lorem.sentence() + '</skos:altLabel>' + "\n";
    if (x % 5 === 1) {
      buffer += "\t\t" + '<skos:definition xml:lang="fr">' +
        faker.Lorem.paragraphs() + '</skos:definition>' + "\n";
    }
    buffer += "\t\t" + '<skos:prefLabel xml:lang="en">' +
        faker.Name.findName() + '</skos:prefLabel>' + "\n";
    buffer += "\t\t" + '<skos:altLabel xml:lang="en">' +
        faker.Lorem.sentence() + '</skos:altLabel>' + "\n";
    if (x % 10 === 1) {
      buffer += "\t\t" + '<skos:definition xml:lang="en">' +
        faker.Lorem.paragraphs() + '</skos:definition>' + "\n";
    }
    if (x % 10 === 0) {
      buffer += "\t\t" + '<skos:broader rdf:resource="./' + (x + 10) + '"/>' + "\n";
    }
    if (x % 15 === 0) {
      buffer += "\t\t" +
        '<skos:narrower rdf:resource="http://' + faker.Internet.domainName() +
        "/" + faker.Internet.domainWord() + '"/>' + "\n";
    }
    buffer += "\t</skos:Concept>\n";
    
    
    fs.writeSync(file, buffer);
    buffer = "";
    
    process.stdout.write('\r' + (1 + x) + ' / ' + argv.s + ' boxes');
  }
  
  fs.writeSync(file, "</rdf:RDF>\n");
  fs.fsyncSync(file);

  tl.stop(createString);
  console.log();
  callback();
}


/**
 * REQUESTS
 */

//
// PUT request function
//
var putRequest = function (callback) {
  tl.start(putString);
  var firstDataReceived = false;
  
  //Options for the PUT request
  var putOptions = {
    host           : targetUrl.hostname,
    port           : targetUrl.port,
    path           : targetUrl.path,
    method         : 'PUT',
    auth           :  userName + ':' + userPass,
    headers        : {
      'Connection' : 'keep-alive',
      'Content-type': 'text/xml'
    }
  };
  
  // Request declaration and events
  var request = http.request(putOptions, function (response) {
    response.on('end', function () {
      tl.stop(putString);
      if (response.statusCode === 409) {
        console.log('\nPut response: ' + response.statusCode.toString().yellow
            + ' - Container already exists, use -c to clean'.yellow);
      }
      else {
        console.log('\nPut response: ' + response.statusCode);
      }
      
      callback();
    });
  });

  request.on('response', function (response) {
    if (!firstDataReceived) {
      firstDataReceived = true;
    }
    
    var count = 0;
    var errCount = 0;
    response.on('data', function (chunk) {
      if (chunk == 'x') {
        errCount++;
      }
      count++;
      var errorMessage = (errCount > 0 ? " (" + errCount + " errors)" : "");
      process.stdout.write('\r\t' + count.toString().cyan + errorMessage.yellow
          + ' → ' + chunk + "       | " + tl.getTimeString(putString).grey + "      ");
    });
  });
  
  request.on('error', function (e) {
    callback('Problem with PUT request: ' + e.message);
  });
  
  request.setSocketKeepAlive(true);
  request.setNoDelay();
  
  //File stream declaration and reading events
  var inputName = "";
  var inputStream = "";
  
  if (filePath === "_") {
    inputName = "stdin";
    inputStream = process.stdin;
    process.stdin.resume()
  }
  else {
    var fileSize = fs.statSync(filePath).size;
    inputName = "bench file of size " + fileSize;
    
    inputStream = fs.createReadStream(filePath);
  }
  
  if (argv.i && (path.extname(filePath) === ".gz" || argv.z)) {
    inputStream = inputStream.pipe(zlib.createGunzip());
    inputName += " (" + "Gunzip activated".blue + ")";
  }
  console.log("# Sending " + inputName + " to "
      + targetUrl.hostname.bold + " (port " + targetUrl.port + ")");
  
  
  inputStream.on('data', function (data) {
    request.write(data);
  });
  //No event on close
  inputStream.on('error', function (err) {
    request.abort();
    callback("PUT error when reading file: " + err);
  });
  
};

// PUT copy request
var copyRequest = function (callback) {
  console.log('# Copy container: ');
  tl.start(copyString);
  var firstDataReceived = false;
  
  var copyOptions = {
    host           : targetUrl.hostname,
    port           : targetUrl.port,
    path           : '/lincopy.xml',
    method         : 'PUT',
    auth           : userName + ':' + userPass,
    headers        : {
      'Connection' : 'keep-alive',
      'content-type': 'text/x-url'
    }
  };
  
  var request = http.request(copyOptions, function (response) {
    response.on('end', function () {
      tl.stop(copyString);
      console.log('\nCopy response: ' + response.statusCode);
      
      callback();
    });
  });
  request.write(targetUrl.path); //URL à copier
  
  request.on('response', function (response) {
    if (!firstDataReceived) {
      console.log("Time to receive a response: ".grey + tl.getTimeString(copyString).grey);
      firstDataReceived = true;
    }
    
    var count = 0;
    var errCount = 0;
    response.on('data', function (chunk) {
      if (chunk == 'x') {
        errCount++;
      }
      count++;
      var errorMessage = (errCount > 0 ? " (" + errCount + " errors)" : "");
      process.stdout.write('\r\t' + count.toString().cyan + errorMessage.yellow
          + ' → ' + chunk + "       | " + tl.getTimeString(copyString).grey + "      ");
    });
  });
  
  request.on('error', function (e) {
    callback('Problem with PUT copy request: ' + e.message);
  });
  
  request.setSocketKeepAlive(true);
  request.setNoDelay();
  request.end();
};




//
// DELETE request function
//
var delRequest = function (callback) {
  process.stdout.write('# Delete test container: ');
  var delOptions = {
    host           : targetUrl.hostname,
    port           : targetUrl.port,
    path           : targetUrl.path,
    method         : 'DELETE',
    auth           : userName + ':' + userPass,
    headers        : { 'Connection' : 'keep-alive' }
  };
  
  var request = http.request(delOptions, function (response) {
    response.on('end', function () {
      console.log(response.statusCode);
      
      callback();
    });
  });
  request.on('error', function (e) {
    callback('Problem with DELETE request: ' + e.message);
  });
  
  request.setSocketKeepAlive(true);
  request.setNoDelay();
  request.end();
};

// DELETE copy request
var delCopyRequest = function (callback) {
  process.stdout.write('# Delete copy container: ');
  
  var delCopyOptions = {
    host           : targetUrl.hostname,
    port           : targetUrl.port,
    path           : '/lincopy.xml',
    method         : 'DELETE',
    auth           : userName + ':' + userPass,
    headers        : { 'Connection' : 'keep-alive' }
  };
  
  var request = http.request(delCopyOptions, function (response) {
    response.on('end', function () {
      console.log(response.statusCode);
      
      callback();
    });
  });
  request.on('error', function (e) {
    callback('Problem with DELETE copy request: ' + e.message);
  });
  
  request.setSocketKeepAlive(true);
  request.setNoDelay();
  request.end();
};


//
// Final callback, displays results
//
var endCallback = function (err, results) {
  
  if (err) {
    console.log("\n# ".red + err.red.bold);
  }
  else {
    __.each(tl.listAction, function (values, key) {
      console.log("\t" + key.cyan + ": "
          + values.duration.bold
          + " \t (" + values.start.toLocaleTimeString() + " - "
          + values.end.toLocaleTimeString() + ")");
    });
  }
  
  console.log("# End of bench\n");
}




/**
 * PROCESSING
 */

var waterfallFunctions = [];


if (userPass === undefined || userPass === "") {
  waterfallFunctions.push(promptPassword);
}

//Check if the test data file exists
var fileExist = true;
try {
  fileExist = fs.statSync(filePath).isFile();
} catch (e) {
  fileExist = false;
  if (argv.i && argv.i !== "_") {
    console.log('# Error: the given file doesn\'t exist.'.red);
    process.exit(1);
  }
}
if (!fileExist && argv.i && argv.i !== "_") {
  console.log('# Error: the given path is not a valid file.'.red);
  process.exit(1);
}


if ((argv.f || !fileExist) && argv.i === undefined) {
  waterfallFunctions.push(createFakeData);        //Create data
}

waterfallFunctions.push(putRequest);              //Send PUT

if (argv.copy) {
  waterfallFunctions.push(copyRequest);           //Send PUT copy
  
  if (argv.clean) {
    waterfallFunctions.push(delCopyRequest);      // Send DELETE copy
  }
}

if (argv.clean) {
  waterfallFunctions.push(delRequest);            //Send DELETE
}

async.waterfall(waterfallFunctions, endCallback);

