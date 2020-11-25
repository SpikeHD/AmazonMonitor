const util = require('../common/util')
const amazon = require('../common/Amazon')
const { addWatchlistItem } = require('../common/data')
const { cache_limit, tld } = require('../config.json')

module.exports = {
  name: "watch",
  desc: "Add and watch a single Amazon link",
  usage: "watch [argument type (eg, -q for query, -c for category, -l or nothing for link)] [amazon link OR category link OR search query] [optional: price limit]",
  type: "edit"
}

module.exports.run = async (bot, guild, message, args) => {
  // Get an array of all existing entries to make sure we don't have a duplicate
  let existing = bot.watchlist.filter(x => x && x.guild_id === message.guild.id)
  let asin, itld, obj, mContents;
  let priceLimit = 0;
  let exists = false
  let argsObj = {
    link: '',
    category: '',
    query:'',
    priceLim: 0
  }
  let clArgs = util.argParser(args, argsObj)

  priceLimit = clArgs.priceLim

  bot.debug.log(existing, 'debug')
  bot.debug.log(clArgs, 'debug')

  if (clArgs.link.length > 0) {
    // Compare asins for duplicate
    try {
      asin = clArgs.link.split("/dp/")[1].match(/^[a-zA-Z0-9]+/)[0]
      itld = clArgs.link.split('amazon.')[1].split('/')[0]
    } catch (e) {
      return 'Not a valid link'
    }
  
    if (parseFloat(args[2])) priceLimit = parseFloat(util.priceFormat(args[2]))
  
    // If there isn't one, it's probably just a bad URL
    if (!asin) return 'Not a valid link'
    else {
      // Loop through existing entries, check if they include the asin somewhere
      existing.forEach(itm => {
        if (itm.link.includes(asin)) {
          exists = true
        }
      })
    }
  
    if (exists) {
      return 'I\'m already watching that link somewhere else!'
    } else if (existing.length >= bot.itemLimit) {
      return 'You\'re watching too many links! Remove one from your list and try again.'
    } else {
      let item = await amazon.details(bot, `https://www.amazon.${itld}/dp/${asin.replace(/[^A-Za-z0-9]+/g, '')}/`).catch(e => debug.log(e.message, 'error'))
      let values = [guild.id, message.channel.id, item.full_link, (parseFloat(util.priceFormat(item.price).replace(/,/g, '')) || 0), item.full_title, priceLimit]
      obj = {
        guild_id: values[0],
        channel_id: values[1],
        link: values[2],
        lastPrice: values[3],
        item_name: values[4],
        priceLimit: values[5],
        type: 'link'
      }
  
      bot.debug.log('Occasionally one or a couple of these values will be empty. Doesn\'t affect functionality', 'info')
      bot.debug.log(values, 'debug')

      mContents = `Now watching ${item.full_link}, ${priceLimit != 0 ? `\nI'll only send a message if the item is under $${values[5]}!`:`I'll send updates in this channel from now on!`}`
    }
  } else if (clArgs.category.length > 0) {
    // Make sure it is a proper category by grabbing some items.
    // We store the items and refresh the cache about once a day.
    const items = await amazon.categoryDetails(bot, clArgs.category).catch(e => {
      debug.log(e.message, 'error')
      return message.channel.send('Invalid category!')
    })

    // Check for existing
    existing.forEach(itm => {
      if (itm.link && itm.link.includes(items.node)) {
        exists = true
      }
    })
    
    if (exists) {
      return message.channel.send('I am already watching that category!')
    }

    // Less detailed object because we request item details later.
    obj = {
      guild_id: guild.id,
      channel_id: message.channel.id,
      link: items.link,
      cache: items.list.slice(0, cache_limit),
      priceLimit: clArgs.priceLim || 0,
      type: 'category'
    }

    mContents = `Now watching the category "${items.name}", ${priceLimit != 0 ? `\nI'll only send a message if an item is under $${priceLimit}!`:`I'll send updates in this channel from now on!`}`
  } else if (clArgs.query.length > 0) {
    // Check for existing
    existing.forEach(itm => {
      if (itm.query && itm.query.toLowerCase().includes(clArgs.query.toLowerCase())) {
        exists = true
      }
    })

    // Add query to watchlist
    let items = await amazon.find(bot, clArgs.query, tld)

    if (items.length < 1) {
      return message.channel.send('I couldn\'t find anything using this query. Try something more generic!')
    }

    obj = {
      guild_id: guild.id,
      channel_id: message.channel.id,
      query: clArgs.query,
      cache: items.slice(0, cache_limit),
      priceLimit: clArgs.priceLim || 0,
      type: 'query'
    }

    mContents = `I am now watching items under the "${clArgs.query}" query. ${priceLimit != 0 ? `\nI'll only send a message if an item is under $${priceLimit}!`:`I'll send updates in this channel from now on!`}`
  } else {
    return message.channel.send('Not a valid link, category, or search query')
  }

  // Push the values to storage
  addWatchlistItem(obj).then(() => {
    // Also add it to the existing watchlist obj so we don't have to re-do the request that gets them all
    bot.watchlist.push(obj)
  
    message.channel.send(mContents)
  })
}
