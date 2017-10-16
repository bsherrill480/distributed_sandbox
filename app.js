var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
// var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var fs = require('fs');
var NodeCache = require('node-cache');
var sqlite3 = require('sqlite3');
var _ = require('lodash');

var myCache = new NodeCache({ checkperiod: 0, useClones: false }); // MAX PERFORMANCE!
var read_db = new sqlite3.Database('ski_read.db', sqlite3.OPEN_READONLY, function (err) {
  if (err) {
    console.log('dbErr', err);
  }
});
// var write_db = new sqlite3.Database('ski_write.db', sqlite3.OPEN_READWRITE, function (err) {
var in_memory_write_db = new sqlite3.Database(':memory:', sqlite3.OPEN_READWRITE, function (err) {
  if (err) {
    console.log('writeDbErr', err);
  }
  else { // use for in memory application
    in_memory_write_db.run('CREATE TABLE rides(resort_id int, day int, skier_id int, lift_id int, time' +
        ' int); CREATE INDEX skier_id_idx ON rides(skier_id);');
  }
  // write_db.run('DELETE FROM rides');
});

function getCacheKey(skierId, dayNum) {
  return `${skierId}.${dayNum}`;
}

var routes = require('./routes/index');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
// app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// app.use('/', routes);
// app.use('/users', users);
app.post('/load', function (req, res) {
  var { resortId, day, skierId, liftId, time } = req.body;
  var params = [resortId, day, skierId, liftId, time];
  var valid = params.reduce((okay, value) => okay && value, true);
  if (valid) {
    in_memory_write_db.run('INSERT INTO rides VALUES (?, ?, ?, ?, ?)', params);
    return res.send('okay');
  } else {
    res.status(400).send('bad');
  }
});

function liftIdToVert(liftId) {
  if (liftId <= 10) {
    return 200;
  } else if (liftId <= 20) {
    return 300;
  } else if (liftId <= 30) {
    return 400;
  }
  return 500;
}

function parseSqlResults(results) {
  var i, result, liftId, runCount, totalRuns, runsVert, totalVert;
  totalVert = 0;
  totalRuns = 0;
  for (i = 0; i < results.length; i++) {
    result = results[i];
    liftId = result['lift_id'];
    runCount = result['COUNT(*)'];
    runsVert = liftIdToVert(liftId) * runCount;
    totalVert += runsVert;
    totalRuns += runCount
  }
  return {
    totalVert,
    totalRuns
  }
}

app.get('/myvert/:skierId/:dayNum', function (req, res) {
  var params = req.params;
  var cacheKey = getCacheKey(params.skierId, params.dayNum);
  myCache.get(cacheKey, function (err, cacheResult) {
    if (cacheResult) {
      res.send(cacheResult);
    } else {
      read_db.all(
          'SELECT lift_id, COUNT(*) FROM rides WHERE skier_id=? AND day=? GROUP BY lift_id', 
          [params.skierId, params.dayNum], 
          function (err, results) {
            var parsedResults = parseSqlResults(results);
            var jsonResponse = JSON.stringify(parsedResults);
            myCache.set(cacheKey, jsonResponse, 0);
            res.send(jsonResponse);
          }
      );
    }
  });
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: err
  });
});

module.exports = app;
