const debug = require('./debug')
const request = require('request')
const fs = require('fs')
const headers = {
  'Origin': 'http://www.checkaflip.com',
  'Accept-Language': 'en-US,en;q=0.9',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.87 Safari/537.36 OPR/54.0.2952.60 FunkoFuckedTookStock',
  'Accept': 'application/json, text/javascript, */*; q=0.01'
}

exports.getEbayAverage = (itm, lim) => {
  return new Promise((resolve, reject) => {
    var options = {
      'method': 'POST',
      'url': 'http://www.checkaflip.com/api',
      'headers': headers,
      formData: {
        'json': `{"instance":"SearchByKeywords","slot1":"${itm.replace(/ /g, '+')}","slot2":false,"slot3":{"instance":"Returns"}}`
      }
    }
    request(options, function(err, res) {
      if(err) throw Error(err)
      console.log()
      resolve(JSON.parse(res.body).slot2.splice(0, lim))
    })
  })
}