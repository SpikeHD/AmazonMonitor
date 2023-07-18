import fs from 'fs'
import { Client, EmbedBuilder, Message } from 'discord.js'
import { trim } from '../common/utils'
import debug from '../common/debug'
import { search } from '../common/amazon'

const { tld, search_response_ms } = JSON.parse(fs.readFileSync('./config.json').toString())

export default {
  name: 'search',
  description: 'Search and return the top 10 items using a search term',
  usage: 'search [search term]',
  type: 'view',
  run
}

async function run(bot: Client, message: Message, args: string[]) {
  args.splice(0, 1)
  const phrase = args.join(' ')

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