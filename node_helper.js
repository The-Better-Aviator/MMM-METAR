const NodeHelper = require('node_helper');
const fetch = require('node-fetch');

module.exports = NodeHelper.create({
  // This function will be executed when this loads and connects to module
  start: function () {
    console.log(this.name + ' started');
  },
  // This is used as a trigger from main module
  // sendSocketNotification returns a response to main module
  socketNotificationReceived: function (notification, payload) {
    var airports = payload;
    switch (notification) {
      case 'MMM_FETCH_DATA':
        this.getData(airports);
        break;
    }
  },
  apiCall: function (url, callback, method = null, headers = null) {
    var options = { method: method, headers: headers };
    fetch(url, options)
      .then((res) => res.json())
      .then((json) => callback(json))
      .catch((err) => console.log(err));
  },
  getData: function (airports) {
    var url = `https://beta.aviationweather.gov/cgi-bin/data/metar.php?ids=${airports}&format=json`;
    this.apiCall(url, (res) => {
      this.sendSocketNotification('MMM_METAR_RECEIVED', res);
    });
  },
});
