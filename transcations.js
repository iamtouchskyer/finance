const _ = require('lodash');
const request = require('request');
const sleep = require('sleep');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const userAgents = require('./userAgents');

function generateHistoricalTranscationURLsFromStock(stockSymbol)
{
  return new Promise((resolve, reject) => {
    request(`http://money.finance.sina.com.cn/corp/go.php/vMS_MarketHistory/stockid/${stockSymbol}.phtml`, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        const dom = new JSDOM(body);

        const yearDom = dom.window.document.getElementsByName('year')[0];

        let years = [];
        for (let i = 0; i < yearDom.children.length; i++) {
          years.push(yearDom.children[i].value);
        }

        const result = _.chain(years)
            .sortBy(_.identity)
            .map((year) => _.times(4, (n) => { return {year: year, quarter: n+1}; }))
            .flatten()
            .map((obj) => `http://money.finance.sina.com.cn/corp/go.php/vMS_MarketHistory/stockid/${stockSymbol}.phtml?year=${obj.year}&jidu=${obj.quarter}`)
            .value();

        resolve(result);
      } else {
        reject(error);
      }
    });
  });
}

function getHistoricalTranscationDataFromURL(url) {
  const schema = [
    {type: 'date', hasLink: true, key: 'date'},
    {type: 'number', hasLink: false, key: 'openingPrice'},
    {type: 'number', hasLink: false, key: 'highestPrice'},
    {type: 'number', hasLink: false, key: 'lowestPrice'},
    {type: 'number', hasLink: false, key: 'closingPrice'},
    {type: 'number', hasLink: false, key: 'tradingVolume'},
    {type: 'number', hasLink: false, key: 'transactionAmount'},
  ];

  const options = {
    url: url,
    headers: {
      'User-Agent': userAgents[parseInt(Math.random() * userAgents.length)]
    }
  };

  return new Promise((resolve, reject) => {
    request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log((new Date()).toLocaleTimeString('en-US') + ':' + options.url);
        const dom = new JSDOM(body);

        // HTMLTableElement => HTMLTableElement.tBodies => HTMLTableRowElement => HTMLTableCellElement => 
        const transcationTable = dom.window.document.getElementById('FundHoldSharesTable');
        if (_.isNull(transcationTable) || _.isUndefined(transcationTable)) {
          resolve([]);
          return;
        }
        const transcationBody = transcationTable.tBodies;
        if (_.isNull(transcationBody) || _.isUndefined(transcationBody)) {
          resolve([]);
          return;
        }
        const transcationData = transcationBody[0].rows;
        if (_.isNull(transcationData) || _.isUndefined(transcationData)) {
          resolve([]);
          return;
        }

        let transcations = [];
        for (let i = 1; i < transcationData.length; i++) {
          const cells = transcationData[i].cells;

          const result = 
            _.zipObject(
              _.map(schema, item=>item.key),
              _.map(schema, (item, index) => {
                let theValue = cells[index].childNodes[0].childNodes[1] ? 
                  cells[index].childNodes[0].childNodes[1].childNodes[0].wholeText.trim() : cells[index].childNodes[0].childNodes[0].wholeText.trim();

                theValue = 
                  item.type === 'date' ? 
                    theValue : item.type === 'number' ? 
                      parseFloat(theValue) : theValue;

                return theValue;
              })
            );

          transcations.push(result);
        }

        resolve(transcations);
      } else {
        reject({url: options.url, err: error, statusCode: response && response.statusCode});
      }
    });
  });
}

async function queue(urls) {
  let data = [];
  for (let url of urls) {
    let res = await getHistoricalTranscationDataFromURL(url);
    sleep.sleep(parseInt(Math.random(5))+3);
    data.push(res);
  }
  return data;
}

function getHistoricalTranscationDataByStock(stockSymbol) {
  console.log(stockSymbol);
  return generateHistoricalTranscationURLsFromStock(stockSymbol)
          .then((urls) => {
            return queue(urls);
          })
          .then((result) => _.flatten(result))
          .catch(error => {
            console.log(error);
            throw error;
          });
}

module.exports = getHistoricalTranscationDataByStock;
