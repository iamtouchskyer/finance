const _ = require('lodash');
const sleep = require('sleep');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const transcations = require('./transcations');

const db = new sqlite3.Database('./stocks.db');

/*
db.serialize(function() {
  db.run("CREATE TABLE lorem (info TEXT)");

  var stmt = db.prepare("INSERT INTO lorem VALUES (?)");
  for (var i = 0; i < 10; i++) {
      stmt.run("Ipsum " + i);
  }
  stmt.finalize();

  db.each("SELECT rowid AS id, info FROM lorem", function(err, row) {
      console.log(row.id + ": " + row.info);
  });
});

db.close();
*/

function generateStockSymbols()
{
  return new Promise((resolve, reject) => {
    const stocksSymbol = require('./assets/stocks.json');

    resolve(_.map(stocksSymbol.items, (item) => item.symbol));
  });
}

function foo(stockSymbol) {
  if (fs.existsSync(`./assets/${stockSymbol}.json`)) {
    return Promise.resolve(0);
  }

  return transcations(stockSymbol)
        .then((transcations) => {
          fs.writeFileSync(`./assets/${stockSymbol}.json`, JSON.stringify(transcations), 'utf8');
        /*
          db.serialize(function() {
            db.run('CREATE TABLE IF NOT EXISTS Stocks (stock_id INT NOT NULL, date VARCHAR(16) NOT NULL, opening_price DOUBLE NOT NULL, closing_price DOUBLE NOT NULL, highest_price DOUBLE NOT NULL, lowest_price DOUBLE NOT NULL)');
          
            var stmt = db.prepare(`INSERT INTO Stocks (stock_id, date, opening_price, closing_price, highest_price, lowest_price) VALUES (${stockSymbol}, ?, ?, ?, ?, ?)`);
          
            for (var i = 0; i < _.size(transcations); i++) {
              stmt.run(transcations[i].date, transcations[i].openingPrice, transcations[i].closingPrice, transcations[i].highestPrice, transcations[i].lowestPrice);
            }
            stmt.finalize();
          });
          
          db.close();
        */
          return Promise.resolve(0);
      });
}

async function queue(stocks) {
  let data = [];
  for (let stock of stocks) {
    let res = await foo(stock);
    sleep.sleep(parseInt(Math.random(10))+3);
    data.push(res);
  }
  return data;
}

generateStockSymbols().then(stocks => {
  return queue(stocks);
})
.catch(error => console.log(error));
