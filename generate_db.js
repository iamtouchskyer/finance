const mysql   = require('mysql');
const moment  = require('moment');
const _       = require("lodash");
const fs      = require('fs');
const path    = require('path');

function generateMetadata(connection) {
  const metadata  = require('./metadata/stocks_full');
  const stocks = _.map(metadata.items, (item) => {
    let res = _.map([item.symbol, item.name, item.type_name, item.type, item.listed_at], (item) => _.isUndefined(item) || _.isNull(item) ? '' : `'${item}'`);

    res = _.slice(res, 0, _.findLastIndex(res, (item) => item !== '')+1).join(',');

    res = "(" + res + ")";

    connection.query("INSERT INTO `metadata` (`id`, `name`, `region`, `type`, `listed_at`) VALUES " + res + "" , function (error, results, fields) {
    });
  })
  .join(',');
}

function generateRRR(connection) {
  const rrr  = require('./metadata/roic_roe_roa_data');
  _.each(rrr, (item) => {
    const roic = _.map(item.roic, (value, key) => `('${item.id}', '${key}', '${value}')`).join(',');
    const roa = _.map(item.roa, (value, key) => `('${item.id}', '${key}', '${value}')`).join(',');
    const roe = _.map(item.roe, (value, key) => `('${item.id}', '${key}', '${value}')`).join(',');

    connection.query("INSERT INTO `roic` (`symbol`, `year`, `value`) VALUES " + roic, function (error, results, fields) { });
    connection.query("INSERT INTO `roe` (`symbol`, `year`, `value`) VALUES " + roe, function (error, results, fields) { });
    connection.query("INSERT INTO `roa` (`symbol`, `year`, `value`) VALUES " + roa, function (error, results, fields) { });
  });
}

function generateDividend(connection, fileList) {
  _.each(fileList, (fileName) => {
    const data = JSON.parse(fs.readFileSync(fileName, 'utf8'))[0];

    if (_.size(data) > 0) {
      const values = _.map(data, 
            (item) => 
              `('${item.symbol}', '${item.ex_dividend_year}'`
                + ', ' + (_.isEmpty(item.ex_dividend_at) ? 'NULL' : `'${item.ex_dividend_at}'`)
                + ', ' + (_.isEmpty(item.announced_at) ? 'NULL' : `'${item.announced_at}'`)
                + `, '${item.year_profit}', '${item.total_dividend}', '${item.stock_amount}', '${item.sharing}', '${item.growth_rate}', '${item.count_money}', '${item.count_stock_give}', '${item.count_stock_add}')`
          ).join(',');

      connection.query("INSERT INTO `dividend` (`symbol`, `dividend_year`, `dividend_at`, `announced_at`, `yearly_profit`, `total_dividend`, `stock_amount`, `sharing`, `growth_rate`, `dividend_bonus`, `dividend_stock_give`, `dividend_stock_add`) VALUES " + values, function (error, results, fields) { 
        if (error) {
          console.log(error);
          throw error;
        }
      });
    }
  }); 
}

async function doBulkInsert(connection, sqlStatement) {
  return new Promise((resolve, reject) => {
    connection.query(sqlStatement, (error, results, fields) => {
      if (error) reject(error);
      else resolve(results);
    });
  });
}


async function generateHistoricalFianceData(connection, fileList) {
  const keys = ['dvdy', 'pb', 'pcfttm', 'pcftyr', 'pettm', 'petyr', 'totalValue'];
  let theArr = [];
  for (let fileName of fileList) {
    const symbol = path.basename(fileName).substring(0, path.basename(fileName).indexOf('.'));
    const data = JSON.parse(fs.readFileSync(fileName, 'utf8'));

    let res = await Promise.all(_.map(keys, (key) => {
        const value = _.map(data[key][0], (item) => `('${symbol}', '${item.date}', '${item.value}')`).join(',');
        const sqlStatement = "INSERT INTO `" + key + "` (`symbol`, `date`, `value`) VALUES " + value;

        return doBulkInsert(connection, sqlStatement);
      })
    ).then((result) => {
      console.log(fileName + ' complete');
      return result;
    }).catch((error) => {
      console.log('Error: ' + error);
    });

    theArr.push(res);
  }

  return Promise.all(theArr);
}

function cleanTables(connection) {
  connection.query('DELETE FROM `dvdy`');
  connection.query('DELETE FROM `pb`');
  connection.query('DELETE FROM `pcfttm`');
  connection.query('DELETE FROM `pcftyr`');
  connection.query('DELETE FROM `pettm`');
  connection.query('DELETE FROM `petyr`');
  connection.query('DELETE FROM `totalValue`');
}

  /*
  _.each(fileList, (fileName) => {
    const data = JSON.parse(fs.readFileSync(fileName, 'utf8'));

    const symbol = path.basename(fileName).substring(0, path.basename(fileName).indexOf('.'));

    _.each(keys, (key) => {
      const value = _.map(data[key][0], (item) => `('${symbol}', '${item.date}', '${item.value}')`).join(',');

      connection.query("INSERT INTO `" + key + "` (`symbol`, `date`, `value`) VALUES " + value, (error, results, fields) => {
        if (error) console.log(error);
        else console.log(results);
      });
    })

    console.log(fileName + ' complete');
  });
*/

const connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'woaitudou',
  database : 'stock',
});

connection.connect(function(err) {
  if (err)
  console.log(err);
  // connected! (unless `err` is set)
});


//generateMetadata(connection);
//generateRRR(connection);

generateDividend(connection, _.slice(process.argv, 2));
/*
generateHistoricalFianceData(connection, _.slice(process.argv, 2))
  .then(function () {
    connection.end();
  });
*/
//cleanTables(connection);
connection.end();