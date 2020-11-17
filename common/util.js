const { MessageEmbed } = require('discord.js')
const pup = require('puppeteer')
const { proxyRequest } = require('puppeteer-proxy')
const cheerio = require('cheerio')
const fs = require('fs')
const amazon = require('./Amazon')
const debug = require('./debug')
const { getWatchlist, updateWatchlistItem } = require('./data')
const { autoCartLink } = require('../config.json')
let userAgents = [
  'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:75.0) Gecko/20100101 Firefox/75.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/535.11 (KHTML, like Gecko) Ubuntu/14.04.6 Chrome/81.0.3990.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.3538.77 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.62 Safari/537.36 Edg/81.0.416.31'
]
let browser

/**
 * Format prices 
 */
exports.priceFormat = (p) => {
  p = '' + p
  let currencySymbol = p.replace(/[,\.]+/g, '').replace(/\d/g, '')
  if (currencySymbol) p = p.replace(currencySymbol, '')

  // Check if the price uses the reverse format
  if(p.includes(',') && p.includes('.') && p.indexOf(',') > p.indexOf('.')) {
    let cents = p.match(/[^\,]*$/)[0]
    let dollars = p.replace(cents, '').replace(',', '.')
    
    return dollars.replace('.', ',') + cents
  } else if (p.includes(',') && !p.includes('.') && p.split(',')[1].length < 3) {
    return p.replace(',', '.')
  }

  p = parseFloat(p).toLocaleString('en')

  // Okay, so we've made sure that reverse-format prices are fixed,
  // now make sure commas are placed in the right spots
  if (!p.includes('.')) {
    let split = p.split('').concat(['.', '0', '0'])
    p = split.join('')
  }

  return p
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
  let str = "?"
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
    let now = new Date().getTime()
    let proxy
    if (opts.type === 'proxy') {
      let l = fs.readFileSync('proxylist.txt', 'utf8')
      let proxies = l.split('\n')

      if (proxies.length > 0) {
        proxy = 'http://' + proxies[Math.floor(Math.random() * proxies.length)]
      } else {
        debug.log('No proxies found in proxylist.txt', 'error')
      }
    }

    let page = await browser.newPage()
    let uAgent = userAgents[Math.floor(Math.random() * userAgents.length)]
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

    let html = await page.evaluate(() => document.body.innerHTML).catch(e => rej(e))
    let $ = await load(html).catch(e => rej(e))

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
    let $ = cheerio.load(html)
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
  getWatchlist().then(rows => {
    bot.watchlist = JSON.parse(JSON.stringify(rows))
    debug.log('Watchlist Loaded', 'info')

    bot.user.setActivity(`${rows.length} items! | ${bot.prefix}help`, { type: 'WATCHING' })

    // Set an interval with an offset so we don't decimate Amazon with requests
    setInterval(() => {
      debug.log('Checking item prices...', 'message')
      if(bot.watchlist.length > 0) doCheck(bot, 0)
    }, 5000)
  })
}

/**
 * Loops through all watchlist items, looking for price drops
 */
async function doCheck(bot, i) {
  if (i < bot.watchlist.length) {
    const obj = bot.watchlist[i]

    // Get details
    const item = await amazon.details(bot, obj.link)
    const curPrice = parseFloat(item.price.replace(/,/g, '')) || 0
    const underLimit = curPrice < obj.priceLimit || obj.priceLimit === 0;

    // Compare prices
    if (obj.lastPrice === 0 && curPrice !== 0 && underLimit) sendInStockAlert(bot, obj, item)
    if (obj.lastPrice > curPrice && curPrice !== 0 && underLimit) sendPriceAlert(bot, obj, item)
    if (obj.lastPrice < curPrice) pushPriceChange(bot, obj, item)

    setTimeout(() => doCheck(bot, i + 1), 6000)
  }

  getWatchlist().then(rows => {
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
  let link = obj.link
  let channel = bot.channels.cache.get(obj.channel_id)

  // Rework the link to automatically add it to the cart of the person that clicked it
  if(autoCartLink) link = `${obj.link.split('/dp/')[0]}/gp/aws/cart/add.html?&ASIN.1=${obj.asin}&Quantity.1=1`

  let embed = new MessageEmbed()
    .setTitle(`Price alert for "${item.full_title}"`)
    .setAuthor(item.seller)
    .setDescription(`Old Price: ${item.symbol} ${exports.priceFormat(obj.lastPrice)}\nNew Price: ${item.symbol} ${item.price}\n\n${link}`)
    .setColor('GREEN')

  if(channel) channel.send(embed)

  pushPriceChange(bot, obj, item)
}

/**
 * Pushes a change in price to the DB
 */
function pushPriceChange(bot, obj, item) {
  let price = item.price.replace(/,/g, '')
  updateWatchlistItem({
    lastPrice: (parseFloat(price) || 0)
  }, {
    link: obj.link
  })
}

/**
 * Sends an alert that an item that wasn't in stock now is
 */
function sendInStockAlert(bot, obj, item) {
  let channel = bot.channels.cache.get(obj.channel_id)

  // Rework the link to automatically add it to the cart of the person that clicked it
  if(autoCartLink) obj.link = `${obj.link.split('/dp/')[0]}/gp/aws/cart/add.html?&ASIN.1=${obj.asin}&Quantity.1=1`

  let embed = new MessageEmbed()
    .setTitle(`"${item.full_title}" is now in stock!`)
    .setAuthor(item.seller)
    .setDescription(`Current Price: ${item.symbol} ${item.price}\n\n${item.full_link}`)
    .setColor('GREEN')

  if(channel) channel.send(embed)

  pushPriceChange(bot, obj, item)
}
