const _ = require('lodash');
const sleep = require('sleep');
const fs = require('fs');
const request = require('request');


function generateStockSymbols()
{
  return new Promise((resolve, reject) => {
    const stocksSymbol = require('./metadata/stocks_full.json');

    resolve(_.map(stocksSymbol.items, (item) => item.symbol));
  });
}

function foo(stockSymbol) {
  if (fs.existsSync(`./dividend_rate/${stockSymbol}.json`)) {
    return Promise.resolve(0);
  }

  return new Promise((resolve, reject) => {
    request(`http://ulscuq2y.youcaizhushou.com/api/dividend/symbol/${stockSymbol}?page_size=100&page=1&keyword=&sort=ex_dividend_year|desc`, function (error, response, body) {
          if (!error && response.statusCode == 200) {
            resolve(response.body);
          } else {
            reject(error);
          }
    });
  }
  ).then((transcations) => {
    const data = _.map(JSON.parse(transcations), (item) => {
      //if (item.name)
      //  item.name = unescape(item.name.replace(/\u/g, "%u"));

      return item;
    })
          fs.writeFileSync(`./dividend_rate/${stockSymbol}.json`, JSON.stringify(data), 'utf8');

          return Promise.resolve(0);
      });
}

async function queue(stocks) {
  let data = [];
  for (let stock of stocks) {
    if (!fs.existsSync(`./dividend_rate/${stock}.json`)) {
      sleep.sleep(parseInt(Math.random(3)));
    }

    let res = await foo(stock);

    data.push(res);
  }
  return data;
}

generateStockSymbols().then(stocks => {
  return queue(stocks);
})
.catch(error => console.log(error));
