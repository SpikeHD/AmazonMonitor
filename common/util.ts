import { EmbedBuilder } from 'discord.js'
import pup from 'puppeteer'
import useProxy from 'puppeteer-page-proxy'
import cheerio from 'cheerio'
import fs from 'fs'
import * as amazon from './Amazon.js'
import * as debug from './debug.js'
import { getWatchlist, updateWatchlistItem, addWatchlistItem, removeWatchlistItem } from './data.js'

const { auto_cart_link, cache_limit, tld, minutes_per_check } = JSON.parse(fs.readFileSync('./config.json').toString())

let browser
let userAgents = [
  'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:75.0) Gecko/20100101 Firefox/75.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/535.11 (KHTML, like Gecko) Ubuntu/14.04.6 Chrome/81.0.3990.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.3538.77 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.62 Safari/537.36 Edg/81.0.416.31'
]

/**
 * Format prices 
 */
export const priceFormat = (p) => {
  p = '' + p
  let currencySymbol = p.replace(/[,.]+/g, '').replace(/\d/g, '')
  if (currencySymbol) p = p.replace(currencySymbol, '')

  if (!p.includes('.') && !p.includes(',')) {
    p += '.00'
  }

  // Strip symbols from number
  if (p.indexOf('.') > p.indexOf(',')) {
    const cents = p.split('.')[1]
    const dollars = p.split(`.${cents}`)[0].split(',').join('')

    p = `${dollars}.${cents}`
  } else {
    const cents = p.split(',')[1]
    const dollars = p.split(`,${cents}`)[0].split('.').join('')

    p = `${dollars}.${cents}`
  }

  p = parseFloat(p).toFixed(2)

  return p
}

/**
 * Parse arguments from an array, kinda like a commandline.
 * 
 * @param {Array} opts
 * @param {Array} avblArgs 
 */
export const argParser = (opts, avblArgs) => {
  for (let i = 0; i < opts.length; i++) {
    if (opts[i].startsWith('-')) {
      // Get part of flag after hyphen
      let argVal = opts[i].split('-')[opts[i].lastIndexOf('-') + 1]
      // Get matching argument in avblArgs
      let avblArg = Object.keys(avblArgs).filter(x => x.startsWith(argVal[0]))

      console.log(avblArg)
      
      // @ts-expect-error test
      if(typeof(avblArgs[avblArg]) === 'boolean' && (opts[i + 1] && opts[i + 1].startsWith('-') || !opts[i + 1])) {
        // If the argument has no value associated with it, assume boolean
      // @ts-expect-error test
        avblArgs[avblArg] = true
  
        // Otherwise, assume actual
      // @ts-expect-error test
      } else avblArgs[avblArg] = opts[i + 1]
    }
  }

  // Return object with filled in values
  return avblArgs
}

/*
 *  Appends ... to long strings
 */
export const trim = (s, lim) => {
  if(s.length > lim) {
    return s.substr(0, lim) + '...'
  } else return s
}

/**
 * Parses the url_params object to a URL-appendable string
 * 
 * @param {Object} obj 
 */
export const parseParams = (obj) => {
  if(Object.keys(obj).length === 0) return '?'
  let str = '?'
  Object.keys(obj).forEach(k => {
    str += `${k}=${obj[k]}&`
  })
  return str
}

/**
 * Start a puppeteer instance
 */
export const startPup = async () => {
  browser = await pup.launch({
    args: ['--disable-web-security'],
  })
  debug.log('Puppeteer Launched', 'info')
}

/**
 * Get page HTML
 */
export const getPage = async (url, opts) => {
  debug.log('Type: ' + opts.type, 'info')
  debug.log('URL: ' + url, 'info')

  let page = await browser.newPage()
  let uAgent = userAgents[Math.floor(Math.random() * userAgents.length)]
  let now = new Date().getTime()
  let proxy

  if (opts.type === 'proxy') {
    let l = fs.readFileSync('proxylist.txt', 'utf8')
    let proxies = l.split('\n')

    if (proxies.length > 0) {
      proxy = proxies[Math.floor(Math.random() * proxies.length)]
    } else {
      debug.log('No proxies found in proxylist.txt', 'error')
    }
  }

  if (proxy) {
    debug.log('Selected proxy URL: ' + proxy, 'info')
    page.setRequestInterception(true)

    page.on('request', async (req) => {
      await useProxy(req, 'http://' + proxy)
    })
  }

  await page.setUserAgent(uAgent)
  await page.goto(url, {
    waitUntil: 'domcontentloaded',
  })

  debug.log('Waiting a couple seconds for JavaScript to load...', 'info')

  // Click the other offers section to load it
  if (await page.$('.olp-text-box') !== null) await page.click('.olp-text-box')

  await page.waitForTimeout(1500)

  let html = await page.evaluate(() => document.body.innerHTML).catch(e => debug.log(e, 'error'))
  let $ = await load(html).catch(e => debug.log(e, 'error'))

  setTimeout(() => page.close(), 1000)

  debug.log(`Got page in ${new Date().getTime() - now}ms`, 'debug')

  if (typeof $ !== 'function') throw new Error('Cheerio.load() returned something other than a function')

  return $
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
async function load(html) {
  let $ = cheerio.load(html)
  if (hasErrors($)) {
    debug.log('There was an error loading the page, the bot may be flagged', 'error')
    return $
  } else {
    return $
  }
}

/**
 * Inits a watcher that'll check all of the items for price drops
 */
export const startWatcher = async (bot, cfg) => {
  const rows = await getWatchlist()
  cfg.watchlist = JSON.parse(JSON.stringify(rows))
  debug.log('Watchlist Loaded', 'info')

  bot.user.setActivity(`${rows.length} items! | ${cfg.prefix}help`, {
    type: 'WATCHING'
  })

  // Set an interval with an offset so we don't decimate Amazon with requests
  setInterval(() => {
    debug.log('Checking item prices...', 'message')
    if (cfg.watchlist.length > 0) doCheck(bot, cfg, 0)
  }, (minutes_per_check * 60000) || 120000)
}

/**
 * Loops through all watchlist items, looking for price drops
 */
export async function doCheck(bot, cfg, i) {
  if (i < cfg.watchlist.length) {
    const obj = cfg.watchlist[i]

    if (obj.type === 'link') {
      // Get details
      const item = await amazon.details(cfg, obj.link)
      const curPrice = parseFloat(item.price.replace(/,/g, '')) || 0

      priceCheck(bot, cfg, obj, item)
      if (obj.lastPrice !== curPrice) pushPriceChange(obj, item)
    } else if (obj.type === 'category') {
      let total = 0
      // First, get current items in category for comparison
      const newItems = await amazon.categoryDetails(cfg, obj.link)

      // Match items in both arrays and only compare those prices.
      const itemsToCompare = newItems.list.filter(ni => obj.cache.find(o => o.asin === ni.asin))

      // Compare new items to cache and alert on price change
      itemsToCompare.forEach(item => {
        const matchingObj = obj.cache.find(o => o.asin === item.asin)

        // Assign channel_id in case there is an alert to send
        matchingObj.channel_id = obj.channel_id
        if (priceCheck(bot, cfg, matchingObj, item)) total++
      })

      // Push new list to watchlist
      const addition = {
        guild_id: obj.guild_id,
        channel_id: obj.channel_id,
        link: obj.link,
        cache: newItems.list.slice(0, cache_limit),
        priceLimit: obj.priceLimit|| 0,
        type: 'category'
      }

      debug.log(`${total} item(s) changed`, 'debug')

      // Remove old stuff
      await removeWatchlistItem(cfg, obj.link)
      // Add new stuff
      await addWatchlistItem(addition)
      cfg.watchlist.push(obj)
    } else if (obj.type === 'query') {
      let total = 0
      // Same concept as category. Get new items...
      const newItems = await amazon.find(cfg, obj.query, tld)

      // Match items for comparison, if there are no new items (due to error), just return an empty array
      const itemsToCompare = newItems ? newItems.filter(ni => obj.cache.find(o => o.asin === ni.asin)) : []

      itemsToCompare.forEach(item => {
        const matchingObj = obj.cache.find(o => o.asin === item.asin)

        // Assign channel_id in case there is an alert to send
        matchingObj.channel_id = obj.channel_id
        if (priceCheck(bot, cfg, matchingObj, item)) total++
      })

      debug.log(`${total} item(s) changed`, 'debug')

      // Push changes
      const addition = {
        guild_id: obj.guild_id,
        channel_id: obj.channel_id,
        query: obj.query,
        cache: newItems ? newItems.slice(0, cache_limit) : obj.cache,
        priceLimit: obj.priceLimit || 0,
        type: 'query'
      }

      // Remove old stuff
      await removeWatchlistItem(cfg, obj.link)
      // Add new stuff
      await addWatchlistItem(addition) 
      cfg.watchlist.push(obj)
    }

    // Do check with next item
    setTimeout(() => doCheck(bot, cfg, i + 1), fs.existsSync('./proxylist.txt') ? 0 : 6000)
  }

  getWatchlist().then(rows => {
    cfg.watchlist = JSON.parse(JSON.stringify(rows))

    bot.user.setActivity(`${rows.length} items! | ${cfg.prefix}help`, { type: 'WATCHING' })
  })
}

/**
 * Shorthand function for performing simle price comparison.
 * 
 * @param {Any} bot 
 * @param {Object} obj 
 * @param {Object} item 
 */
function priceCheck(bot, cfg, obj, item) {
  const curPrice = parseFloat(item.price.replace(/,/g, '')) || item.lastPrice || 0
  const underLimit = !obj.priceLimit || obj.priceLimit === 0 || curPrice < obj.priceLimit

  // Compare prices
  if (obj.lastPrice === 0 && curPrice !== 0 && underLimit) {
    sendInStockAlert(bot, cfg, obj, item)
    return true
  }
  if (obj.lastPrice > curPrice && curPrice !== 0 && underLimit) {
    sendPriceAlert(bot, cfg, obj, item)
    return true
  }

  return false
}

/**
 * Pushes a change in price to the DB
 */
function pushPriceChange(obj, item) {
  // Check if we *actually* got data
  if (!item.full_title && item.image.includes('via.placeholder.com')) {
    debug.log('Aborting price update, data not valid', 'warn')
    return
  }

  let price = item.price.replace(/,/g, '')

  updateWatchlistItem({
    lastPrice: (parseFloat(price) || 0)
  }, {
    link: obj.link
  })
}


/**
 * Sends an alert to the guildChannel specified in the DB entry
 */
function sendPriceAlert(bot, cfg, obj, item) {
  // Yeah yeah, I'll fix the inconsistant link props later
  let link = (obj.link || obj.full_link) + parseParams(cfg.url_params)
  let channel = bot.channels.cache.get(obj.channel_id)

  debug.log(`Sending price alert for ${item.full_title}`, 'info')
  debug.log(item, 'info')

  // Rework the link to automatically add it to the cart of the person that clicked it
  if(auto_cart_link) link = `${link.split('/dp/')[0]}/gp/aws/cart/add.html${parseParams(cfg.url_params)}&ASIN.1=${item.asin}&Quantity.1=1`

  let embed = new EmbedBuilder()
    .setTitle(`Price alert for "${item.full_title}"`)
    .setAuthor({
      name: item.seller ? item.seller:'Amazon'
    })
    .setDescription(`Old Price: ${item.symbol} ${priceFormat(obj.lastPrice)}\nNew Price: ${item.symbol} ${item.price}\n\n${link}`)
    .setColor('Green')

  if(channel) channel.send({ embeds: [embed] })
}

/**
 * Sends an alert that an item that wasn't in stock now is
 */
function sendInStockAlert(bot, cfg, obj, item) {
  let channel = bot.channels.cache.get(obj.channel_id)
  let link = (obj.link || obj.full_link) + parseParams(cfg.url_params)

  debug.log(`Sending stock alert for ${item.full_title}`, 'info')
  debug.log(item, 'info')

  // Rework the link to automatically add it to the cart of the person that clicked it
  if(auto_cart_link) link = `${link.split('/dp/')[0]}/gp/aws/cart/add.html${parseParams(cfg.url_params)}&ASIN.1=${item.asin}&Quantity.1=1`

  let embed = new EmbedBuilder()
    .setTitle(`"${item.full_title}" is now in stock!`)
    .setAuthor({
      name: item.seller
    })
    .setDescription(`Current Price: ${item.symbol} ${item.price}\n\n${link}`)
    .setColor('Green')

  if(channel) channel.send({ embeds: [embed] })
}
