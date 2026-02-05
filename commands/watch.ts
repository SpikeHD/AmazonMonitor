import fs from 'fs'
import { addWatchlistItem, getWatchlist } from '../common/watchlist.js'
import { Client, Message } from 'discord.js'
import { category, item, search } from '../common/amazon.js'
import { parseArgs } from '../common/arguments.js'

const { cache_limit, tld, guild_item_limit }: Config = JSON.parse(fs.readFileSync('./config.json').toString())

export default {
  name: 'watch',
  desc: 'Add and watch a single Amazon link',
  usage: 'watch [argument type (eg, -q for query, -c for category, -l for link)] [amazon link, category link, or search query] [optional: -p for price limit, -d for price difference, -e for price percentage]',
  type: 'edit',
  run
}

const argDef = {
  link: {
    name: 'link',
    aliases: ['l'],
    type: 'string'
  },
  query: {
    name: 'query',
    aliases: ['q'],
    type: 'string'
  },
  category: {
    name: 'category',
    aliases: ['c'],
    type: 'string'
  },
  priceLimit: {
    name: 'priceLimit',
    aliases: ['p'],
    type: 'number'
  },
  pricePercentage: {
    name: 'pricePercentage',
    aliases: ['e'],
    type: 'number'
  },
  difference: {
    name: 'difference',
    aliases: ['d'],
    type: 'number'
  },
}

async function run(bot: Client, message: Message, args: string[]) {
  const watchlist: Watchlist = await getWatchlist()
  const processed = parseArgs(args, argDef)

  processed.type = processed.link ? 'link' : processed.query ? 'query' : processed.category ? 'category' : null

  if (watchlist.length >= guild_item_limit) {
    message.channel.send(`You have reached the maximum amount of items (${guild_item_limit})`)
    return
  }

  if (!processed.type) {
    message.channel.send('Please provide a valid link or query')
    return
  }

  let response = ''

  // Process the results
  switch(processed.type) {
  case 'link': {
    // @ts-ignore this is guaranteed to be a link
    if (!processed.link?.startsWith('http')) {
      message.channel.send('Please provide a valid link')
      return
    }

    // See if the item is already there
    // @ts-ignore this is guaranteed to be a link
    const existing = watchlist.find(item => item.link === processed.link)

    if (existing) {
      message.channel.send('Item already exists in watchlist')
      return
    }

    // @ts-ignore this is guaranteed to be a link
    const product = await item(processed.link)

    if (!product) {
      message.channel.send('Invalid link')
      return
    }

    addWatchlistItem({
      guildId: message.guildId,
      channelId: message.channelId,
      type: 'link',
      link: processed.link as string,
      priceLimit: processed.priceLimit as number,
      pricePercentage: processed.pricePercentage as number,
      difference: processed.difference as number,
      symbol: product.symbol,
      itemName: product.fullTitle,
      lastPrice: parseFloat(product.price)
    })

    response = `Successfully added item: ${processed.link}`

    break
  }
  case 'category': {
    // @ts-ignore this is guaranteed to be a category
    if (!processed.category?.startsWith('http')) {
      message.channel.send('Please provide a valid link')
      return
    }

    // Get if the category is already there
    // @ts-ignore this is guaranteed to be a category
    const existing = watchlist.find(item => item.link === processed.category)

    if (existing) {
      message.channel.send('Category already exists in watchlist')
      return
    }

    // @ts-ignore this is guaranteed to be a category
    const results = await category(processed.category)

    if (!results) {
      message.channel.send('Invalid link')
      return
    }

    addWatchlistItem({
      guildId: message.guildId,
      channelId: message.channelId,
      type: 'category',
      link: processed.category as string,
      priceLimit: processed.priceLimit as number,
      pricePercentage: processed.pricePercentage as number,
      difference: processed.difference as number,
      symbol: results.list[0].symbol,
      name: results.name,
      cache: results.list.splice(0, cache_limit)
    })

    // Cannot figure out processed.category fix
    response = `Successfully added category: ${results.name}`

    break
  }
  case 'query': {
    // Check if the query is already there
    // @ts-ignore this is guaranteed to be a query
    const existing = watchlist.find(item => item.query === processed.query)

    if (existing) {
      message.channel.send('Query already exists in watchlist')
      return
    }

    // @ts-ignore this is guaranteed to be a query
    const results = await search(processed.query, tld)

    if (!results || results.length < 1) {
      message.channel.send(`No results found for "${processed.query}"`)
      return
    }

    addWatchlistItem({
      guildId: message.guildId,
      channelId: message.channelId,
      type: 'query',
      query: processed.query as string,
      priceLimit: processed.priceLimit as number,
      pricePercentage: processed.pricePercentage as number,
      difference: processed.difference as number,
      cache: results.splice(0, cache_limit),
      symbol: results[0]?.symbol
    })
    
    response = `Successfully added query: ${processed.query}`

    break
  }}

  // Add the extras for price difference, price percentage, and price limit
  if (processed.priceLimit) {
    // @ts-ignore we null check this
    response += `\nPrice must be below ${processed?.symbol || '$'}${processed.priceLimit}`
  }

  if (processed.pricePercentage) {
    response += `\nPrice must be more than ${processed.pricePercentage}% off previous detected price`
  }

  if (processed.difference) {
    // @ts-ignore we null check this
    response += `\nPrice must be more than ${processed?.symbol || '$'}${processed.difference} off previous detected price`
  }

  message.channel.send(response)
}