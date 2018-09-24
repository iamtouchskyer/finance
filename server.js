const express = require('express');
const mysql   = require('mysql');
const _ = require('lodash');
const compression = require('compression');

const app = express();

const connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'woaitudou',
  database : 'stock',
});

app.use(compression());

app.use(function (req, res, next) {
  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', true);

  // Pass to next layer of middleware
  next();
});

async function doBulkQuery(sqlStatement) {
  return new Promise((resolve, reject) => {
    connection.query(sqlStatement, (error, results, fields) => {
      if (error) reject(error);
      else resolve(results);
    });
  });
}

app.get('/api/v1/metadata/basic', (req, res) => {
    connection.query('SELECT * FROM `metadata` ', function (error, stocksMetadata, fields) {
      const result = _.map(stocksMetadata, (stockMetadata) => {
        return {
          stockName: stockMetadata.name,
          stockSymbol: stockMetadata.symbol,
          stockRegion: stockMetadata.region,
          stockType: stockMetadata.type,
          stockListedAt: stockMetadata.listed_at,
        };
      });

      res.send(result);
    });
});

app.get('/api/v1/stock/detail', (req, res) => {
  const sqlStatements = _.map(['pb', 'pettm', 'petyr', 'totalValue'], (item) => 'SELECT date, value FROM `' + item + '` WHERE symbol = ' + req.query.symbol);

  Promise.all(_.map(sqlStatements, (sqlStatement) => doBulkQuery(sqlStatement)))
    .then((results) => {
      res.send(results);
    });
});

app.get('/api/v1/metadata/advanced', (req, res) => {
  const page = req.query.page;
  const size = req.query.size;
    connection.query('SELECT * FROM `metadata` LIMIT ' + page*size + ', ' + size, function (error, stocksMetadata, fields) {
      const range = '(' + _.map(stocksMetadata, (result) => result.symbol).join(",") + ')';

      Promise.all(
          _.map(['roic', 'roa', 'roe'], (item) => doBulkQuery('SELECT * FROM `' + item + '` WHERE symbol in ' + range))
        )
        .then((rrrResult) => {
          const roicResult = _.groupBy(rrrResult[0], (item) => item.symbol);
          const roaResult = _.groupBy(rrrResult[1], (item) => item.symbol);
          const roeResult = _.groupBy(rrrResult[2], (item) => item.symbol);

          const data = 
            _.map(stocksMetadata, (stockMetadata) => {
              return {
                  stockName: stockMetadata.name,
                  stockSymbol: stockMetadata.symbol,
                  stockRegion: stockMetadata.region,
                  stockType: stockMetadata.type,
                  stockListedAt: stockMetadata.listed_at,
                  roic: 
                    _.zipObject(  
                      _.map(roicResult[stockMetadata.symbol], (item) => item.year),
                      _.map(roicResult[stockMetadata.symbol], (item) => item.value)
                    ),
                  roa:
                    _.zipObject(  
                      _.map(roaResult[stockMetadata.symbol], (item) => item.year),
                      _.map(roaResult[stockMetadata.symbol], (item) => item.value)
                    ),
                  roe:
                    _.zipObject(  
                      _.map(roeResult[stockMetadata.symbol], (item) => item.year),
                      _.map(roeResult[stockMetadata.symbol], (item) => item.value)
                    ),
              };
            });

          res.send(data);
        });
    });
  }
);

app.listen(3030, () => console.log('Example app listening on port 3030!'))
