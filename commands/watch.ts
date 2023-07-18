import fs from 'fs'
import { addWatchlistItem, getWatchlist } from '../common/watchlist'
import { Client, Message } from 'discord.js'
import { category, item, search } from '../common/amazon'

const { cache_limit, tld, guild_item_limit }: Config = JSON.parse(fs.readFileSync('./config.json').toString())

interface WatchArgs {
  type: 'link' | 'category' | 'query'
  link: string
  priceLimit: number | null
  pricePercentage: number | null
  difference: number | null
}

export default {
  name: 'watch',
  desc: 'Add and watch a single Amazon link',
  usage: 'watch [argument type (eg, -q for query, -c for category, -l for link)] [amazon link, category link, or search query] [optional: -p for price limit, -d for price difference, -e for price percentage]',
  type: 'edit',
  run
}

const potentialArgs: {
  [key:string]: {
    arg: keyof WatchArgs
    type: string
  }
} = {
  // link
  l: {
    arg: 'link',
    type: 'string'
  },
  // query
  q: {
    arg: 'link',
    type: 'string'
  },
  // category
  c: {
    arg: 'link',
    type: 'string'
  },
  // price limit
  p: {
    arg: 'priceLimit',
    type: 'number'
  },
  // price difference
  d: {
    arg: 'difference',
    type: 'number'
  },
  // price percentage
  e: {
    arg: 'pricePercentage',
    type: 'number'
  }
}

function argsToWatchArgs(args: string[]) {
  const watchArgs: WatchArgs = {
    type: 'link',
    link: '',
    priceLimit: null,
    pricePercentage: null,
    difference: null
  }

  for (const arg of args) {
    if (arg.startsWith('-')) {
      const argName = arg.substring(1)
      const argData = potentialArgs[argName]

      if (!argData) continue

      if (argData.type === 'number') {
        const nextArg = args[args.indexOf(arg) + 1]

        if (!nextArg) continue

        const parsed = parseFloat(nextArg)

        if (isNaN(parsed)) continue

        // @ts-ignore argName is a valid key
        watchArgs[argData.arg] = parsed
        continue
      }

      if (argData.type === 'string') {
        const nextArg = args[args.indexOf(arg) + 1]

        if (!nextArg) continue

        // @ts-ignore argName is a valid key
        watchArgs[argData.arg] = nextArg

        if (argData.arg === 'link') {
          if (argName === 'l') {
            watchArgs.type = 'link'
          } else if (argName === 'c') {
            watchArgs.type = 'category'
          } else if (argName === 'q') {
            watchArgs.type = 'query'
          }
        }
        continue
      }
    } else {
      if (args[1].startsWith('http')) {
        watchArgs.link = args[1]
      }
    }
  }

  return watchArgs
}

async function run(bot: Client, message: Message, args: string[]) {
  const watchlist: Watchlist = await getWatchlist()
  const processed = argsToWatchArgs(args)

  if (watchlist.length >= guild_item_limit) {
    message.channel.send(`You have reached the maximum amount of items (${cache_limit})`)
    return
  }

  if (!processed.link) {
    message.channel.send('Please provide a valid link or query')
    return
  }

  let response = ''

  // Process the results
  switch(processed.type) {
  case 'link': {
    if (!processed.link.startsWith('http')) {
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

    const product = await item(processed.link)

    if (!product) {
      message.channel.send('Invalid link')
      return
    }

    addWatchlistItem({
      guildId: message.guildId,
      channelId: message.channelId,
      type: 'link',
      link: processed.link,
      priceLimit: processed.priceLimit,
      pricePercentage: processed.pricePercentage,
      difference: processed.difference,
      symbol: product.symbol,
      itemName: product.fullTitle,
      lastPrice: parseFloat(product.price)
    })

    response = `Successfully added item: ${processed.link}`

    break
  }
  case 'category': {
    if (!processed.link.startsWith('http')) {
      message.channel.send('Please provide a valid link')
      return
    }

    // Get if the category is already there
    // @ts-ignore this is guaranteed to be a category
    const existing = watchlist.find(item => item.link === processed.link)

    if (existing) {
      message.channel.send('Category already exists in watchlist')
      return
    }

    const results = await category(processed.link)

    if (!results) {
      message.channel.send('Invalid link')
      return
    }

    addWatchlistItem({
      guildId: message.guildId,
      channelId: message.channelId,
      type: 'category',
      link: processed.link,
      priceLimit: processed.priceLimit,
      pricePercentage: processed.pricePercentage,
      difference: processed.difference,
      symbol: results.list[0].symbol,
      name: results.name,
      cache: results.list.splice(0, cache_limit)
    })

    response = `Successfully added category: ${processed.link}`

    break
  }
  case 'query': {
    // Check if the query is already there
    // @ts-ignore this is guaranteed to be a query
    const existing = watchlist.find(item => item.query === processed.link)

    if (existing) {
      message.channel.send('Query already exists in watchlist')
      return
    }

    const results = await search(processed.link, tld)

    if (!results || results.length < 1) {
      message.channel.send(`No results found for "${processed.link}"`)
      return
    }

    addWatchlistItem({
      guildId: message.guildId,
      channelId: message.channelId,
      type: 'query',
      query: processed.link,
      priceLimit: processed.priceLimit,
      pricePercentage: processed.pricePercentage,
      difference: processed.difference,
      cache: results.splice(0, cache_limit),
      symbol: results[0].symbol
    })
    
    response = `Successfully added query: ${processed.link}`

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