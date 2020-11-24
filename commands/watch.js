const util = require('../common/util')
const amazon = require('../common/Amazon')
const { addWatchlistItem } = require('../common/data')

module.exports = {
  name: "watch",
  desc: "Add and watch a single Amazon link",
  usage: "watch [argument type (eg, -q for query, -c for category, -l or nothing for link)] [amazon link OR category link OR search query] [optional: price limit]",
  type: "edit"
}

module.exports.run = async (bot, guild, message, args) => {
  // Get an array of all existing entries to make sure we don't have a duplicate
  let existing = bot.watchlist.filter(x => x && x.guild_id === message.guild.id)
  let asin, tld, obj, mContents;
  let priceLimit = 0;
  let exists = false
  let argsObj = {
    link: '',
    category: '',
    query:''
  }
  let clArgs = util.argParser(args, argsObj)

  bot.debug.log(existing, 'debug')
  bot.debug.log(clArgs, 'debug')

  if (clArgs.link.length > 0) {
    // Compare asins for duplicate
    try {
      asin = clArgs.link.split("/dp/")[1].match(/^[a-zA-Z0-9]+/)[0]
      tld = clArgs.link.split('amazon.')[1].split('/')[0]
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
      let item = await amazon.details(bot, `https://www.amazon.${tld}/dp/${asin.replace(/[^A-Za-z0-9]+/g, '')}/`).catch(e => reject(e.message))
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
    // Add category to watchlist
    let items // This will be the grabbed items from Amazon
    return
  } else if (clArgs.query.length > 0) {
    // Add query to watchlist
    let items // This will be the grabbed items from Amazon
    return
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
