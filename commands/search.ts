import fs from 'fs'
import { Client, EmbedBuilder, Message } from 'discord.js'
import { trim } from '../common/utils.js'
import debug from '../common/debug.js'
import { search } from '../common/amazon.js'
import { parseArgs } from '../common/arguments.js'

const { tld, search_response_ms } = JSON.parse(fs.readFileSync('./config.json').toString())

export default {
  name: 'search',
  description: 'Search and return the top 10 items using a search term',
  usage: 'search [search term] [optional: -p for price limit]',
  type: 'view',
  run
}

const argDef = {
  priceLimit: {
    name: 'priceLimit',
    aliases: ['p'],
    type: 'number'
  },
  pricePercentage: {
    name: 'pricePercentage',
    aliases: ['e'],
    type: 'number'
  }
}

async function run(bot: Client, message: Message, args: string[]) {
  args.splice(0, 1)
  const phrase = args.join(' ')
  const parsedArgs = parseArgs(args, argDef)

  if (!phrase) {
    message.channel.send('Please provide a search term')
    return
  }

  debug.log(`Searching for ${phrase}...`)

  const embed = new EmbedBuilder()
    .setColor('Orange')
    .setTitle(`Search results for phrase: ${phrase}`)

  const results = await search(phrase, tld)

  if (!results || results.length < 1) {
    message.channel.send(`No results found for "${phrase}"`)
    return
  }

  for (let i = 0; i < 10; i++) {
    if (!results[i]) break

    const result = results[i]

    if (parsedArgs.priceLimit && parseFloat(result.price) > (parsedArgs.priceLimit as number)) continue

    embed.addFields([{
      name: trim(result.fullTitle, 50),
      value: `${parseFloat(result.price) ? result.symbol + result.price : 'Not in stock'} - ${result.fullLink}`,
      inline: false
    }])
  }

  message.channel.send({
    embeds: [embed]
  })
}