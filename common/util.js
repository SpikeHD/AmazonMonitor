const { MessageEmbed } = require('discord.js')
const pup = require('puppeteer')
const { proxyRequest } = require('puppeteer-proxy')
const cheerio = require('cheerio')
const fs = require('fs')
const amazon = require('./Amazon')
const debug = require('./debug')
var userAgents = [
  'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:75.0) Gecko/20100101 Firefox/75.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/535.11 (KHTML, like Gecko) Ubuntu/14.04.6 Chrome/81.0.3990.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.3538.77 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.62 Safari/537.36 Edg/81.0.416.31'
]
var browser

/**
 * Format prices 
 */
exports.priceFormat = (p) => {
  // Check if the price uses the reverse format
  if(p.includes(',') && p.includes('.') && p.indexOf(',') > p.indexOf('.')) {
    var cents = p.match(/[^\,]*$/)[0]
    var dollars = p.replace(cents, '').replace(',', '.')
    
    return dollars.replace('.', ',') + cents
  } else if (p.includes(',') && !p.includes('.') && p.split(',')[1].length < 3) {
    return p.replace(',', '.')
  }

  return p.replace(',', '')
}

/*
 *  Appends ... to long strings
 */
exports.trim = (s, lim) => {
  if(s.length > 70) {
    return s.substr(0, 70) + '...'
  } else return s
}

/**
 * Parses the URLParams object to a URL-appendable string
 * 
 * @param {Object} obj 
 */
exports.parseParams = (obj) => {
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
exports.startPup = async () => {
  browser = await pup.launch()
  debug.log('Puppeteer Launched', 'info')
}

/**
 * Get page HTML
 */
exports.getPage = (url, opts) => {
  return new Promise(async (res, rej) => {
    debug.log('Type: ' + opts.type, 'info')
    var now = new Date().getTime()
    if (opts.type === 'proxy') {
      var l = fs.readFileSync('proxylist.txt', 'utf8')
      var proxies = l.split('\n')
      var proxy

      if (proxies.length > 0) {
        proxy = 'http://' + proxies[Math.floor(Math.random() * proxies.length)]
      } else {
        debug.log('No proxies found in proxylist.txt', 'error')
      }
    }

    var page = await browser.newPage()
    var uAgent = userAgents[Math.floor(Math.random() * userAgents.length)]
    if (proxy) {
      debug.log('Selected proxy URL: ' + proxy, 'info')
      page.setRequestInterception(true)
      page.on('request', (request) => {
        proxyRequest({
          page,
          proxyUrl: proxy,
          request
        })
      })
    }

    await page.setUserAgent(uAgent)
    await page.goto(url)

    debug.log('Waiting a couple seconds for JavaScript to load...', 'info')
    await page.waitFor(2000)

    var html = await page.evaluate(() => document.body.innerHTML).catch(e => rej(e))
    var $ = await load(html).catch(e => rej(e))

    await page.close()

    debug.log(`Got page in ${new Date().getTime() - now}ms`, 'debug')
    res($)
  })
}

/**
 * Checks for errors, I guess. Not super reliable I will admit
 * 
 * @param {*} $ 
 */
function hasErrors($) {
  if($('title').first().text().trim().includes('Sorry!')) {
    return true
  } else return false
}

/**
 * Load HTML with cheerio
 */
function load(html) {
  return new Promise((res, rej) => {
    var $ = cheerio.load(html)
    if(hasErrors($)) {
      rej({ message: 'Amazon Service Error' })
    } else {
      res($)
    }
  })
}

/**
 * Inits a watcher that'll check all of the items for price drops
 */
exports.startWatcher = (bot) => {
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
async function doCheck(bot, i) {
  if (i < bot.watchlist.length) {
    var obj = bot.watchlist[i]

    // Get details
    var item = await amazon.details(bot, obj.link)
    var curPrice = parseFloat(item.price.replace(/^\D+/g, "")) || 0
    var underLimit = curPrice < obj.priceLimit || obj.priceLimit === 0;

    // Compare prices
    if (obj.lastPrice === 0 && curPrice !== 0 && underLimit) sendInStockAlert(bot, obj, item)
    if (obj.lastPrice > curPrice && curPrice !== 0 && underLimit) sendPriceAlert(bot, obj, item)
    if (obj.lastPrice < curPrice) pushPriceChange(bot, obj, item)

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
  // Hacky but effective way to get currency symbol
  var currencySymbol = item.price.replace('.', '').replace(/\d/g, "")
  var embed = new MessageEmbed()
    .setTitle(`Price alert for "${item.full_title}"`)
    .setAuthor(item.seller)
    .setDescription(`Old Price: ${currencySymbol} ${obj.lastPrice}\nNew Price: ${currencySymbol} ${item.price.replace(currencySymbol, '')}\n\n${item.full_link}`)
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
