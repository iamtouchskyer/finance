const request = require('request');
const sleep = require('sleep');
const fs = require('fs');
const _ = require('lodash');
const stocksSymbol = require('./assets/stocks.json');
const moment = require('moment');

function generateStockSymbols()
{
  return new Promise((resolve, reject) => {

    resolve(_.map(stocksSymbol.items, (item) => {
      return {
        symbol: item.symbol,
        fromDate: moment(new Date(item.listed_at)).format('YYYY-MM-DD'),
        toDate: moment(new Date()).format('YYYY-MM-DD'),
      };
    }));
  });
}

function getData(type, stock) {
  return new Promise((resolve, reject) => {
    const formData = {
      report_type: type,
      report_stock_id: stock.symbol,
      from_date: '2013-09-17',//stock.fromDate,
      to_date: stock.toDate,
    };

    const post_options = {
        url: 'http://47.97.225.177/tools/compare/historical_valuation_data.php',
        method: 'POST',
        form: formData,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Host': 'www.dashiyetouzi.com',
            'Origin': 'http://www.dashiyetouzi.com',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.92 Safari/537.36',
            'Cookie': 'PHPSESSID=4idk8hdkcdmo6stb5b6lddvm13; cGS5_2132_saltkey=f2xww57I; cGS5_2132_lastvisit=1537098346; Hm_lvt_210e7fd46c913658d1ca5581797c34e3=1537101948,1537101965; cGS5_2132_seccode=307.7beb341feafc666630; cGS5_2132_ulastactivity=4422LMhBxL7xPS8LB5mpKdT6SyPmPSEJGHYXEVYxgDDCE5J5ntpU; cGS5_2132_auth=85a2Zvjm1mk140qE7zmPzfLxX1%2BQU0puyJqL8lmAOg8b%2FcQ6XHZ7CUrwXM2bQHorxf1vvDARy4Vm3U1ZIX57%2BLuIZA; cGS5_2132_creditnotice=0D0D2D0D0D0D0D0D0D45920; cGS5_2132_creditbase=0D0D0D0D0D0D0D0D0; cGS5_2132_creditrule=%E6%AF%8F%E5%A4%A9%E7%99%BB%E5%BD%95; cGS5_2132_sid=q3mY6C; cGS5_2132_lip=114.249.133.199%2C1537105459; cGS5_2132_lastact=1537105461%09historical_valuation_data.php%09; Hm_lpvt_210e7fd46c913658d1ca5581797c34e3=1537105461'
        }, 
    };

    // Set up the request
    request(post_options, function(error, res, body) {
      if (!error && res.statusCode == 200) {
        const jsonizedBody = JSON.parse(body);


        const objectizedBody = _.map(jsonizedBody.list, (item) => {
          return {
            date: item[0],
            value: item[1]
          };
        });

        resolve(_.zipObject([type], [objectizedBody]));
      } else {
        reject('Error: ' + error);
      }
    });
  });
}

function foo(stock) {
  const filePath = `./assets2/${stock.symbol}.json`;
  if (fs.existsSync(filePath)) {
    return Promise.resolve(0);
  }

  return Promise.all(
    _.map(['totalValue', 'pettm', 'petyr', 'pb', 'pcfttm', 'pcftyr', 'psttm', 'pstyr', 'dvdy'],
    (type) => {
      return getData(type, stock);
    })
  ).then((arr) => {
    console.log((new Date()).toLocaleTimeString('en-US') + ':' + stock.symbol);

    const res = _.zipObject(_.map(arr, (item) => _.keys(item)), _.map(arr, (item) => _.values(item)));

    fs.writeFileSync(filePath, JSON.stringify(res), 'utf8');

  });
}

async function queue(stocks) {
  let data = [];
  for (let stock of stocks) {
    let res = await foo(stock);
    sleep.sleep(parseInt(Math.random(5))+3);
    data.push(res);
  }
  return data;
}

generateStockSymbols()
  .then((stocks) => {
    return queue(stocks);
});


/*

<select id="report_type" style="width: 140px;" onchange="GetData();">
  <option value="totalValue" selected="">总市值</option>
  <option value="pettm">市盈率PE(TTM)</option>
  <option value="petyr">市盈率PE(LYR)</option>
  <option value="pb">市净率PB(LF)</option>
  <option value="pcfttm">市现率PCF(TTM)</option>
  <option value="pcftyr">市现率PCF(LYR)</option>
  <option value="psttm">市销率PS(TTM)</option>
  <option value="pstyr">市销率PS(LYR)</option>
  <option value="dvdy">股息率</option>
</select>

totalValue
pettm
petyr
pb
pcfttm
pcftyr
psttm
pstyr
dvdy
*/