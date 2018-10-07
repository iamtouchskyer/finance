const request = require('request');
const fs = require('fs');
const _ = require('lodash');

function foo(page, numberPerPage) {
  return new Promise((resolve, reject) => {
    request({url:
      `https://www.iwencai.com/stockpick/cache?token=${token}&p=${page}&perpage=${numberPerPage}&changeperpage=1&showType=[%22%22,%22%22,%22onTable%22,%22onTable%22,%22onTable%22,%22onTable%22,%22onTable%22,%22onTable%22,%22onTable%22,%22onTable%22,%22onTable%22,%22onTable%22,%22onTable%22,%22onTable%22,%22onTable%22,%22onTable%22]`,
      headers: {
        'Cookie': 'PHPSESSID=9b52fe02445ccfeda6e622866f2ef03b; cid=9b52fe02445ccfeda6e622866f2ef03b1537409917; ComputerID=9b52fe02445ccfeda6e622866f2ef03b1537409917; other_uid=Ths_iwencai_Xuangu_mxh9vcrevdv5zhqv3ixajx90622a5y8c; other_uname=xwem0bfj7r; user=MDp0b3VjaHNreWVyOjpOb25lOjUwMDo0NzMxNzY3OTc6NywxMTExMTExMTExMSw0MDs0NCwxMSw0MDs2LDEsNDA7NSwxLDQwOjE6Ojo0NjMxNzY3OTc6MTUzNzQxNDUzMzo6OjE1Mzc0MTQ0NDA6NjA0ODAwOjA6MTQ3N2Y5Y2U3OWUyMDEwZTE4MWI0ZTJmMGZmNjhjNWViOmRlZmF1bHRfMjow; userid=463176797; u_name=touchskyer; escapename=touchskyer; ticket=408f77cca1d8fbc4a2bad4d79000ab16; v=AhQILTuNM2xn9aegD_KYvjJV41mFbSdGeuTMuK_qox0jX7rP1n0I58qhnRT9',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.92 Safari/537.36',
      }
    },
    function (error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log(`Page:${page},numberPerPage:${numberPerPage} Done!`);

        const jsonizedData = JSON.parse(response.body);

        resolve({result: jsonizedData.result ? jsonizedData.result : [], oriIndexID: jsonizedData.oriIndexID ? jsonizedData.oriIndexID : []});
      } else {
        reject(error);
      }
    });
  });
}

async function queue(token) {
  let memo = {result:[], oriIndexID:[]};
  
  for (let i=0; i<40; i++) {
    let res = await foo(token, i, 100);

    memo.result = [...memo.result, ...res.result];
    memo.oriIndexID = _.isEmpty(res.oriIndexID) ? memo.oriIndexID : res.oriIndexID;
  }

  return memo;
}

function parseData(data) {
  function translateKey(theKey) {
    const mappingArray = {
      "市净率(pb)" : "pb",
      "市盈率(pe)" : "petyr",
      "市销率(ps)" : "ps",
      "基本每股收益": "beps",
      "销售毛利率": "gpm",  // Gross Profit Margin
      "销售净利率": "npm",  // Net Profit Margin
      "预测市盈率(pe,最新预测)" : "peestimate",
      "营业收入": "revenue",
      "总市值" : "totalValue",
      "a股市值(不含限售股)" : "totalValueA",
      "所属同花顺行业" : "industry", 
      "市盈率(pe,ttm)" : 'pettm',
      "投入资本回报率roic" : 'roic',
      "净资产收益率roe(加权,公布值)" : 'roe',
      "总资产净利率roa" : 'roa',
      "预测净资产收益率(roe)平均值" : 'roeestimate',
      "归属于母公司所有者的净利润" : 'parentRevenud',
      "股东权益合计" : 'totalEquity',
    };

    return mappingArray[theKey];
  }

  return _.map(data.result, (item) => {
      let objectiedItem = {};
      for (let i=0; i<_.size(data.oriIndexID); i++) {
        if (_.isString(data.oriIndexID[i])) {
          if (data.oriIndexID[i] === '所属同花顺行业') {
            objectiedItem[data.oriIndexID[i]] = item[i].substring(0, item[i].indexOf('-'));
          } else if (data.oriIndexID[i] === '_stk-code_') {
            objectiedItem['symbol'] = item[i].substring(0, item[i].indexOf('.'));
            objectiedItem['region'] = item[i].substring(item[i].indexOf('.')+1);
          } else if (data.oriIndexID[i] === '_stk-name_') {
            objectiedItem['name'] = item[i];
          } else {
            objectiedItem[translateKey(data.oriIndexID[i])] = item[i];
	  }

        } else if (_.isArray(data.oriIndexID[i])) {
          if (_.size(data.oriIndexID[i]) === 5) {
            objectiedItem[translateKey(data.oriIndexID[i][0])] = {
              2017: parseFloat(item[i][0]),
              2016: parseFloat(item[i][1]),
              2015: parseFloat(item[i][2]),
              2014: parseFloat(item[i][3]),
              2013: parseFloat(item[i][4]),
            };
          } else {
            objectiedItem[translateKey(data.oriIndexID[i][0])] = {
              2020: parseFloat(item[i][0]),
              2019: parseFloat(item[i][1]),
              2018: parseFloat(item[i][2]),
            };
          }
        } else {
          console.log(typeof(data.oriIndexID[i]));
        }
      }

      return objectiedItem;
    });
}



function _doRealParse(dataList) {
  const parsedData = _.map(dataList, (data) => parseData(data));
  const stkCode = _.intersection([..._.flatten(_.map(parsedData, (data) => _.map(data, 'symbol')))]);
  
  fs.writeFileSync(
      'wencai.json',
        _.map(stkCode, (theCode) => {
          const result =  _.merge({}, ..._.flatten(_.map(parsedData, data => _.find(data, (item) => item['symbol'] === theCode))));

          console.log(result.symbol);

          return JSON.stringify(result);
        }).join(',\n')
      , 
      'utf8'
    );  
}

function doFetch(tokenList) {
  Promise.all(_.map(tokenList, (token) => queue(token)))
    .then((dataArr) => {
      _doRealParse(dataArr);
    })
    .catch(error => console.log(error));
}

function doParse(fileList) {
  _doRealParse(_.map(fileList, (fileName) => JSON.parse(fs.readFileSync(fileName, 'utf8'))));
}

if (process.argv[2] === 'parse') {
  doParse(process.argv.slice(3));
} else if (process.argv[2] === 'fetch') {
  doFetch(process.argv.slice(3));
} else if (process.argv[2] === 'import') {
  doImport(process.argv.slice(3));
} else {
  console.log(
    `${process.argv[0]} ${process.argv[1]} parse fileList:array\n
      ${process.argv[0]} ${process.argv[1]} fetch token:array\n
      ${process.argv[0]} ${process.argv[1]} import finalFile\n
    `);
}