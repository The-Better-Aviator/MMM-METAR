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
    setInterval(() => {
      this.updateDom(1000);
    }, 15000);
  },
  // This function renders your content on MM screen
  getDom: function () {
    let metarContent = document.createElement('div');
    metarContent.classList.add('metar');
    let metarTable = document.createElement('table');
    if (this.config.airports.length > 0) {
      if (this.config.metarData !== null) {
        let metarData = arrayToSort(this.config.metarData, this.config.useSort);
        metarData.forEach((airport) => {
          let metarTableRow = document.createElement('tr');
          let metarString = airport.rawOb.replace(`${airport.icaoId} `, '');
          let conditions = this.checkConditions(airport);
          let conditionsStyle = this.config.useColor
            ? conditions.toLowerCase()
            : 'conditions';
          metarTableRow.innerHTML = `<td style="text-align:left">${airport.icaoId}</td><td class="${conditionsStyle}" style="text-align:left">${conditions}</td><td style="text-align:left">${metarString}</td>`;
          metarTable.appendChild(metarTableRow);
        });
      } else {
        this.config.airports.forEach((airport) => {
          let metarTableRow = document.createElement('tr');
          metarTableRow.innerHTML = `<td style="text-align:left">${airport}</td><td></td><td style="text-align:left">Fetching...</td>`;
          metarTable.appendChild(metarTableRow);
        });
      }
    } else {
      metarTable.innerHTML =
        '<tr><em>Please add airports to config.js</em></tr>';
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
        this.config.metarData = payload;
        break;
      case 'MMM_ERROR_RECEIVED':
        break;
    }
  },
  sortObject(objectToSort, sortType) {
    result = {};
    switch (sortType) {
      case 'array':
        result = objectToSort.sort(
          (a, b) =>
            this.config.airports.indexOf(a.icaoId) -
            this.config.airports.indexOf(b.icaoId)
        );
        break;
      case 'alpha':
        result = objectToSort.sort((a, b) => a.icaoId.localeCompare(b.icaoId));
        break;
    }
    return result;
  },
  fetchData() {
    this.sendSocketNotification('MMM_FETCH_DATA', this.config.airports);
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
      (coverage) => coverage == 'BKN' || coverage == 'OVC'
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
