const { MessageEmbed } = require('discord.js')
const amazon = require('../common/Amazon')
const { addWatchlistItem } = require('../common/data')

module.exports = {
  name: "watch",
  desc: "Add and watch a single Amazon link",
  usage: "watch [amazon link] [optional: price limit]",
  type: "edit"
}

module.exports.run = (bot, guild, message, args) => {
  return new Promise(async (resolve, reject) => {
    // Get an array of all existing entries to make sure we don't have a duplicate
    let existing = bot.watchlist.filter(x => x.guild_id === message.guild.id)
    let asin, tld;
    let priceLimit = 0;
    let exists = false

    bot.debug.log(existing, 'debug')
  
    // Compare asins for duplicate
    try {
      asin = args[1].split("/dp/")[1].match(/^[a-zA-Z0-9]+/)[0]
      tld = args[1].split('amazon.')[1].split('/')[0]
    } catch(e) {
      reject('Not a valid link')
    }

    if(parseFloat(args[2])) priceLimit = parseFloat(args[2].replace(',', '.'))
  
    // If there isn't one, it's probably just a bad URL
    if (!asin) reject('Not a valid link')
    else {
      // Loop through existing entries, check if they include the asin somewhere
      existing.forEach(itm => {
        if (itm.link.includes(asin)) {
          exists = true
        }
      })
    }
  
    if(exists) {
      reject('I\'m already watching that link somewhere else!')
    }else if(existing.length >= bot.itemLimit) {
      reject('You\'re watching too many links! Remove one from your list and try again.')
    } else {
      let item = await amazon.details(bot, `https://www.amazon.${tld}/dp/${asin.replace(/[^A-Za-z0-9]+/g, '')}/`).catch(e => reject(e.message))
      let values = [guild.id, message.channel.id, item.full_link, (parseFloat(item.price.replace(/^\D+/g, "")) || 0), item.full_title, priceLimit]
      let obj = {
        guild_id: values[0],
        channel_id: values[1],
        link: values[2],
        lastPrice: values[3],
        item_name: values[4],
        priceLimit: values[5]
      }

      bot.debug.log('Occasionally one or a couple of these values will be empty. Doesn\'t affect functionality', 'info')
      bot.debug.log(values, 'debug')

      // Push the values to storage
      addWatchlistItem(obj).then(() => {
        // Also add it to the existing watchlist obj so we don't have to re-do the request that gets them all
        bot.watchlist.push(obj)

        resolve(message.channel.send(`Now watching ${item.full_link}, ${priceLimit != 0 ? `\nI'll only send a message if the item is under $${values[5]}!`:`I'll send updates in this channel from now on!`}`))
      })
    }
  })
}
