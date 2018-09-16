const sleep = require('sleep');

async function queue(arr) {
  let data = [];
  for (let promise of arr) {
    let res = await promise;
    console.log(1);
    sleep.sleep(parseInt(Math.random(10))+3);
    console.log(2);
    data.push(res);
  }
  return data;
}

module.exports = queue;