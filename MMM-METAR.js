Module.register('MMM-METAR', {
  // This object stores default configuration values
  defaults: {
    airports: [],
    useColor: false,
    useSort: 'array',
    metarData: null,
  },
  // This function will be executed when your module loads successfully
  start: function () {
    if (this.config.useSort === 'alpha') {
      this.config.airports.sort((a, b) => a.localeCompare(b));
    }
  },
  // This function renders your content on MM screen
  getDom: function () {
    let metarContent = document.createElement('div');
    metarContent.classList.add('metar');
    let metarTable = document.createElement('table');
    if (this.config.airports.length > 0) {
      // Build Table
      this.config.airports.forEach((airport) => {
        let metarTableRow = document.createElement('tr');
        metarTableRow.innerHTML = `<td id="${airport}" style="text-align:left">${airport}</td><td id="${airport}COND" class="dimmed" style="text-align:left">...</td><td id="${airport}METAR" class="dimmed" style="text-align:left">Fetching...</td>`;
        metarTable.appendChild(metarTableRow);
      });
    } else {
      metarTable.innerHTML =
        '<tr class="bright"><em>Please add airports to config.js</em></tr>';
    }
    metarContent.appendChild(metarTable);
    return metarContent;
  },
  getStyles() {
    return [this.file('MMM-METAR.css')];
  },
  getTranslations() {
    return false;
  },
  notificationReceived: function (notification, payload, sender) {
    switch (notification) {
      case 'DOM_OBJECTS_CREATED':
        this.fetchData();
        setInterval(() => {
          this.fetchData();
        }, 900000);
        break;
    }
  },
  socketNotificationReceived: function (notification, payload) {
    switch (notification) {
      case 'MMM_METAR_RECEIVED':
        this.updateData(payload);
        break;
      case 'MMM_ERROR_RECEIVED':
        break;
    }
  },
  fetchData() {
    this.sendSocketNotification('MMM_FETCH_DATA', this.config.airports);
  },
  updateData(payload) {
    let lastFetch = payload;
    if (this.config.metarData === null) {
      this.config.metarData = lastFetch;
    }
    this.config.airports.forEach((airport) => {
      let airportElement = document.getElementById(airport);
      let conditionsElement = document.getElementById(`${airport}COND`);
      let metarElement = document.getElementById(`${airport}METAR`);
      // Find object that matches airport
      let metarAirport = lastFetch.find((obj) => obj.icaoId === airport);
      if (metarAirport !== undefined) {
        // Update the table data
        airportElement.classList.remove('dimmed');
        conditionsElement.classList.remove('dimmed');
        metarElement.classList.remove('light');
        let conditions = this.checkConditions(metarAirport);
        let conditionsClass = this.config.useColor
          ? conditions.toLowerCase()
          : 'dimmed';
        conditionsElement.classList.add(conditionsClass);
        conditionsElement.innerHTML = conditions;
        let metarString = metarAirport.rawOb.replace(`${airport.icaoId} `, '');
        metarElement.innerHTML = metarString;
        // Update the metarData object
        let metarDataIndex = this.config.metarData.findIndex(
          (obj) => obj.icaoId === airport
        );
        if (metarDataIndex != -1) {
          this.config.metarData[metarDataIndex] = metarAirport;
        } else {
          this.config.metarData.push(metarAirport);
        }
      } else {
        let metarAirport = this.config.metarData.find(
          (obj) => obj.icaoId === airport
        );
        if (metarAirport !== undefined) {
          let expired = this.checkExpired(metarAirport.reportTime);
          if (expired) {
            airportElement.classList.add('dimmed');
            conditionsElement.classList.add('dimmed');
            metarElement.classList.add('light');
          }
        }
      }
    });
  },
  checkExpired(dateTimeString) {
    const dateToCheck = new Date(dateTimeString);
    const oneHour = 60 * 60 * 1000;
    if (Date.now() - dateToCheck > oneHour) {
      return true;
    }
    return false;
  },
  checkConditions(metarObject) {
    let result = '';
    let visibility = parseInt(metarObject.visibility);
    let ceiling = this.findCeiling(
      metarObject.cldCvg1,
      metarObject.cldCvg2,
      metarObject.cldCvg3,
      metarObject.cldCvg4,
      metarObject.cldBas1,
      metarObject.cldBas2,
      metarObject.cldBas3,
      metarObject.cldBas4
    );
    let flightCategories = ['LIFR', 'IFR', 'MVFR', 'VFR'];
    let visibilityCategory = 0;
    let ceilingCategory = 0;
    switch (visibility) {
      case visibility < 100:
        visibilityCategory = 0;
        break;
      case visibility >= 100 && visibility < 300:
        visibilityCategory = 1;
        break;
      case visibility >= 300 && visibility < 500:
        visibilityCategory = 2;
        break;
      default:
        visibilityCategory = 3;
        break;
    }
    switch (ceiling) {
      case ceiling < 5:
        ceilingCategory = 0;
        break;
      case ceiling >= 5 && ceiling < 10:
        ceilingCategory = 1;
        break;
      case ceiling >= 10 && ceiling < 30:
        ceilingCategory = 2;
        break;
      default:
        ceilingCategory = 3;
        break;
    }
    let flightCategoryInt = Math.min(visibilityCategory, ceilingCategory);
    result = flightCategories[flightCategoryInt];
    return result;
  },
  findCeiling(
    cldCvg1,
    cldCvg2,
    cldCvg3,
    cldCvg4,
    cldBas1,
    cldBas2,
    cldBas3,
    cldBas4
  ) {
    let result = 0;
    let coverages = [cldCvg1, cldCvg2, cldCvg3, cldCvg4];
    let ceilingIndex = coverages.findIndex(
      (coverage) => coverage === 'BKN' || coverage === 'OVC'
    );
    let bases = [cldBas1, cldBas2, cldBas3, cldBas4];
    if (ceilingIndex != -1) {
      result = parseInt(bases[ceilingIndex]);
    } else {
      result = 999;
    }
    return result;
  },
});
