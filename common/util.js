const { MessageEmbed } = require('discord.js')
const pup = require('puppeteer')
const cheerio = require('cheerio')
const fs = require('fs')
const request = require('request-promise')
const amazon = require('./Amazon')
const debug = require('./debug')
var userAgents = [
  'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:75.0) Gecko/20100101 Firefox/75.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/535.11 (KHTML, like Gecko) Ubuntu/14.04.6 Chrome/81.0.3990.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.3538.77 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.62 Safari/537.36 Edg/81.0.416.31'
]
var browser

module.exports = {
  trim: (s, lim) => trim(s, lim),
  parseParams: (obj) => parseParams(obj),
  startPup: () => startPup(),
  getPage: (url, opt) => getPage(url, opt),
  startWatcher: (bot) => startWatcher(bot)
}

/*
 *  Appends ... to long strings
 */
function trim(s, lim) {
  if(s.length > 70) {
    return s.substr(0, 70) + '...'
  } else return s
}

function parseParams(obj) {
  if(Object.keys(obj).length === 0) return ''
  var str = "?"
  Object.keys(obj).forEach(k => {
    str += `${k}=${obj[k]}&`
  })
  return str
}

/**
 * Start a puppeteer instance
 */
async function startPup() {
  browser = await pup.launch()
  debug.log('Puppeteer Launched', 'info')
}

/**
 * Get page HTML
 */
function getPage(url, opts) {
  return new Promise((res, rej) => {
    console.log(opts)
    var now = new Date().getTime()
    if(opts.type === 'proxy') {
      var l = fs.readFileSync('proxylist.txt', 'utf8')
      var proxies = l.split('\n')

      if(proxies.length > 0) {
        var proxy = 'https://' + proxies[Math.floor(Math.random() * proxies.length)]
        var options = {
          proxy: proxy,
          uri: url,
          followAllRedirects: true,
          transform: (body) => {
            return cheerio.load(body)
          }
        }

        request(options).then($ => {
          debug.log(`Got page in ${new Date().getTime() - now}ms`, 'debug')
          res($)
        }).catch(e => rej(e))

      } else {
        debug.log('No proxies found in proxylist.txt. If it\'s empty, remove the file', 'error')
        rej('No Proxies')
      }
    } else {
      browser.newPage().then(page => {
        var uAgent = userAgents[Math.floor(Math.random() * userAgents.length)]
        page.setUserAgent(uAgent).then(() => {
          page.goto(url).then(() => {
            page.evaluate(() => document.body.innerHTML).then(html => {
              debug.log(`Got page in ${new Date().getTime() - now}ms`, 'debug')
              load(html).then(c => res(c)).catch(e => rej(e))
              page.close()
            })
          })
        })
      })
    }
  })
}

function checkForErrors($) {
  if($('title').first().text().trim().includes('Sorry!')) {
    return true
  } else return false
}

/**
 * Load HTML with cheerio
 */
function load(html) {
  return new Promise(res => {
    res(cheerio.load(html))
  })
}

/**
 * Inits a watcher that'll check all of the items for price drops
 */
function startWatcher(bot) {
  bot.con.query(`SELECT * FROM watchlist`, (err, rows) => {
    if (err) throw err
    bot.watchlist = JSON.parse(JSON.stringify(rows))
    debug.log('Watchlist Loaded', 'info')

    bot.user.setActivity(`${rows.length} items! | ${bot.prefix}help`, { type: 'WATCHING' })

    // Set an interval with an offset so we don't decimate Amazon with requests
    setInterval(() => {
      debug.log('Checking item prices...', 'message')
      if(bot.watchlist.length > 0) doCheck(bot, 0)
    }, 180000)
  })
}

/**
 * Loops through all watchlist items, looking for price drops
 */
function doCheck(bot, i) {
  if (i < bot.watchlist.length) {
    var obj = bot.watchlist[i]

    // Get details
    amazon.details(bot, obj.link).then(item => {
      var curPrice = parseFloat(item.price.replace(/^\D+/g, "")) || 0
      var underLimit = curPrice < obj.priceLimit || obj.priceLimit === 0;

      // Compare prices
      if (obj.lastPrice === 0 && curPrice !== 0 && underLimit) sendInStockAlert(bot, obj, item)
      if (obj.lastPrice > curPrice && curPrice !== 0 && underLimit) sendPriceAlert(bot, obj, item)
      if (obj.lastPrice < curPrice) pushPriceChange(bot, obj, item)
    })

    setTimeout(() => doCheck(bot, i + 1), 6000)
  }

  bot.con.query(`SELECT * FROM watchlist`, (err, rows) => {
    if (err) throw err
    bot.watchlist = JSON.parse(JSON.stringify(rows))

    bot.user.setActivity(`${rows.length} items! | ${bot.prefix}help`, { type: 'WATCHING' })
  })
}

/**
 * Sends an alert to the guildChannel specified in the DB entry
 * 
 * TODO: Maybe support multiple alerts (out of stock, back in stock, etc.)?
 */
function sendPriceAlert(bot, obj, item) {
  var channel = bot.channels.cache.get(obj.channel_id)
  var embed = new MessageEmbed()
    .setTitle(`Price alert for "${item.full_title}"`)
    .setAuthor(item.seller)
    .setDescription(`Old Price: $${obj.lastPrice}\nNew Price: $${item.price}\n\n${item.full_link}`)
    .setColor('GREEN')

  if(channel) channel.send(embed)

  pushPriceChange(bot, obj, item)
}

/**
 * Pushes a change in price to the DB
 */
function pushPriceChange(bot, obj, item) {
  var price = item.price.replace(/^\D+/g, "")
  bot.con.query(`UPDATE watchlist SET lastPrice=? WHERE link=?`, [(parseFloat(price) || 0), obj.link], (err) => {
    if (err) throw err
  })
}

/**
 * Sends an alert that an item that wasn't in stock now is
 */
function sendInStockAlert(bot, obj, item) {
  var channel = bot.channels.cache.get(obj.channel_id)
  var embed = new MessageEmbed()
    .setTitle(`"${item.full_title}" is now in stock!`)
    .setAuthor(item.seller)
    .setDescription(`Current Price: $${item.price}\n\n${item.full_link}`)
    .setColor('GREEN')

  if(channel) channel.send(embed)

  pushPriceChange(bot, obj, item)
}
