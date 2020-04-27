const { MessageEmbed } = require('discord.js')
const pup = require('puppeteer')
const cheerio = require('cheerio')
const amazon = require('./Amazon')
var browser

module.exports = {
  trim: (s, lim) => trim(s, lim),
  startPup: () => startPup(),
  getPage: (url) => getPage(url),
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

/**
 * Start a puppeteer instance
 */
async function startPup() {
  browser = await pup.launch()
  console.log("Puppeteer launched")
}

/**
 * Get page HTML
 */
function getPage(url) {
  return new Promise(res => {
    browser.newPage().then(page => {
      page.goto(url).then(() => {
        page.evaluate(() => document.body.innerHTML).then(html => {
          res(load(html))
          page.close()
        })
      })
    })
  })
}


/**
 * Load HTML with cheerio
 */
function load(html) {
  return new Promise(res => res(cheerio.load(html)))
}

/**
 * Inits a watcher that'll check all of the items for price drops
 */
function startWatcher(bot) {
  bot.con.query(`SELECT * FROM watchlist`, (err, rows) => {
    if (err) throw err
    bot.watchlist = JSON.parse(JSON.stringify(rows))
    console.log("Watchlist loaded")

    bot.user.setActivity(`${rows.length} items! | ${bot.prefix}help`, { type: 'WATCHING' })

    // Set an interval with an offset so we don't decimate Amazon with requests
    setInterval(() => {
      if(bot.watchlist.length > 0) doCheck(bot, 0)
    }, 5000)
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

      // Compare prices
      if (obj.lastPrice === 0 && curPrice !== 0) sendInStockAlert(bot, obj, item)
      if (obj.lastPrice > curPrice && curPrice !== 0) sendPriceAlert(bot, obj, item)
      if (obj.lastPrice < curPrice) pushPriceChange(bot, obj, item)
    })

    setTimeout(() => doCheck(bot, i + 1), 2000)
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
    .setDescription(`Old Price: $${obj.lastPrice}\nNew Price: $${item.price}`)
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
    .setDescription(`Current Price: $${item.price}`)
    .setColor('GREEN')

  if(channel) channel.send(embed)

  pushPriceChange(bot, obj, item)
}