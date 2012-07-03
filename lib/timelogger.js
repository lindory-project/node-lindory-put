/*jslint node: true, maxlen: 120, maxerr: 50, indent: 2 */
'use strict';

module.exports = function () {
  var that = this;
  that.listAction = {};
  that.start = function (action) {
    that.listAction[action] =  { start: new Date(), end: null };
  };
  
  that.stop = function (action) {
    that.listAction[action].end = new Date();
    var duration = humanize(that.listAction[action].end - that.listAction[action].start);
    that.listAction[action].duration = duration;
    return duration;
  };
  
  that.getTimeString = function (action) {
    var duration = (new Date() - that.listAction[action].start) / 1000;
    var hours = Math.floor(duration / 3600);
    var mins = Math.floor(duration % 3600 / 60);
    var sec = Math.floor(duration % 3600 % 60);
    return ((hours > 0 ? hours + "h " : "")
        + (mins > 0 ? (hours > 0 && mins < 10 ? "0" : "") + mins + "m " : "0m ")
        + (sec < 10 ? "0" : "") + sec + "s");
  }
  
  var humanize = function (ms) {
    var sec = 1000
      , min = 60 * 1000
      , hour = 60 * min;
  
    if (ms >= hour) { return (ms / hour).toFixed(1) + ' h'; }
    if (ms >= min) { return (ms / min).toFixed(1) + ' m'; }
    if (ms >= sec) { return (ms / sec || 0).toFixed(1) + ' s'; }
    return ms + ' ms';
  };
}
