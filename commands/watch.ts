import fs from 'fs'
import * as util from '../common/util.js'
import * as amazon from '../common/Amazon.js'
import { addWatchlistItem } from '../common/data.js'
import { Guild, Message } from 'discord.js'

const { cache_limit, tld } = JSON.parse(fs.readFileSync('./config.json').toString())

export default {
  name: 'watch',
  desc: 'Add and watch a single Amazon link',
  usage: 'watch [argument type (eg, -q for query, -c for category, -l for link)] [amazon link, category link, or search query] [optional: -p for price limit]',
  type: 'edit',
  run
}

interface Args {
  link: string,
  category: string,
  query: string,
  priceLimit: number | string
}

async function run(cfg, guild: Guild, message: Message, args) {
  // Get an array of all existing entries to make sure we don't have a duplicate
  let existing = Array.isArray(cfg.watchlist) ? cfg.watchlist.filter(x => x && x.guild_id === message.guild.id) : []
  let asin, itld, obj, mContents
  let priceLimit = 0
  let exists = false
  let argsObj: Args = {
    link: '',
    category: '',
    query:'',
    priceLimit: 0,
  }
  let clArgs = util.argParser(args, argsObj)

  priceLimit = clArgs.priceLimit

  cfg.debug.log(existing, 'debug')
  cfg.debug.log(clArgs, 'debug')
  cfg.debug.log(`Price Limit: ${priceLimit}`, 'debug')

  if (clArgs.link.length > 0) {
    // Compare asins for duplicate
    try {
      asin = (clArgs.link.split('/dp/')[1] || clArgs.link.split('/gp/product/')[1]).match(/^[a-zA-Z0-9]+/)[0]
      itld = clArgs.link.split('amazon.')[1].split('/')[0]
    } catch (e) {
      return cfg.debug.log(e, 'warning')
    }
  
    if (parseFloat(args[2])) priceLimit = parseFloat(util.priceFormat(args[2]))
  
    // If there isn't one, it's probably just a bad URL
    if (!asin) return cfg.debug.log('Not a valid asin', 'error')
    else {
      // Loop through existing entries, check if they include the asin somewhere
      existing.forEach(itm => {
        if (itm.link && itm.link.includes(asin)) {
          exists = true
        }
      })
    }
  
    if (exists) {
      return message.channel.send('I\'m already watching that link somewhere else!')
    } else if (existing.length >= cfg.itemLimit) {
      return message.channel.send('You\'re watching too many links! Remove one from your list and try again.')
    }

    let item = await amazon.details(cfg, `https://www.amazon.${itld}/dp/${asin.replace(/[^A-Za-z0-9]+/g, '')}/`).catch(e => cfg.debug.log(e.message, 'error'))
    obj = {
      guild_id: guild.id,
      channel_id: message.channel.id,
      link: item.full_link,
      lastPrice: parseFloat(util.priceFormat(item.price)) || 0,
      item_name: item.full_title,
      priceLimit: priceLimit,
      type: 'link'
    }

    mContents = `Now watching ${item.full_link}, ${priceLimit != 0 ? `\nI'll only send a message if the item is under ${String(priceLimit).endsWith('%') ? priceLimit + ' off' : '$' + priceLimit}!`:'I\'ll send updates in this channel from now on!'}`
  } else if (clArgs.category.length > 0) {
    // Make sure it is a proper category by grabbing some items.
    // We store the items and refresh the cache about once a day.
    const items = await amazon.categoryDetails(cfg, clArgs.category).catch(async e => {
      cfg.debug.log(await e.message, 'error')
    })

    if (!items) return message.channel.send('Invalid category!')

    // Check for existing
    existing.forEach(itm => {
      if (itm.link && items.node && itm.link.includes(items.node)) {
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
      name: items.name,
      link: items.link,
      cache: items.list.slice(0, cache_limit),
      priceLimit: clArgs.priceLimit || 0,
      type: 'category'
    }

    mContents = `Now watching the category "${items.name}", ${priceLimit != 0 ? `\nI'll only send a message if an item is under ${String(priceLimit).endsWith('%') ? priceLimit + ' off' : '$' + priceLimit}!`:'I\'ll send updates in this channel from now on!'}`
  } else if (clArgs.query.length > 0) {
    // Check for existing
    existing.forEach(itm => {
      if (itm.query && itm.query.toLowerCase().includes(clArgs.query.toLowerCase())) {
        exists = true
      }
    })

    // Add query to watchlist
    let items = await amazon.find(cfg, clArgs.query, tld)

    if (items.length < 1) {
      return message.channel.send('I couldn\'t find anything using this query. Try something more generic!')
    }

    obj = {
      guild_id: guild.id,
      channel_id: message.channel.id,
      query: clArgs.query,
      cache: items.slice(0, cache_limit),
      priceLimit: clArgs.priceLimit|| 0,
      type: 'query'
    }

    mContents = `I am now watching items under the "${clArgs.query}" query. ${priceLimit != 0 ? `\nI'll only send a message if an item is under ${String(priceLimit).endsWith('%') ? priceLimit + ' off' : '$' + priceLimit}!`:'I\'ll send updates in this channel from now on!'}`
  } else {
    return message.channel.send(`Not a valid link, category, or search query. Refer to \`${cfg.prefix}help\` for more info!`)
  }

  // Push the values to storage
  addWatchlistItem(obj).then(() => {
    // Also add it to the existing watchlist obj so we don't have to re-do the request that gets them all
    cfg.watchlist.push(obj)
  
    message.channel.send(mContents)
  })
}
