import { EmbedBuilder, Guild, Message } from 'discord.js'
import { trim } from '../common/util.js'
import { getWatchlist } from '../common/data.js'

export default {
  name: 'watchlist',
  desc: 'Display a list of each Amazon link currenty being watched in this server',
  usage: 'watchlist',
  type: 'view',
  run
}

async function run(cfg, guild: Guild, message: Message) {
  const rows = await getWatchlist()
  let links = rows.map((x, i) => {
    if (x.type === 'link') return `${i + 1}. ${trim(x.item_name, 100)}\n${x.link.substring(0, x.link.lastIndexOf('/')) + '/'}${x.priceLimit != 0 ? `\nMust be $${x.priceLimit}` : ''}`
    else if (x.type === 'category') return `${i + 1}. Category: "${x.name}"`
    else if (x.type === 'query') return `${i + 1}. Query: "${x.query}"`
  })

  cfg.debug.log('Raw database output:', 'debug')
  cfg.debug.log(rows, 'debug')

  let embed = new EmbedBuilder()
    .setTitle('List of Amazon items currently being watched')
    .setColor('Blue')
    .setFooter({
      text: `Currently watching ${rows.length} items in this server`
    })

  const description = links.length > 0 ? links.join('\n\n') : 'You haven\'t added any items yet!'
  const maxLen = 2048
  const splitDescriptions = description.split('')

  const chunks = []

  // Split description into chunks of size maxLen
  while (splitDescriptions.length > 0) {
    chunks.push(splitDescriptions.splice(0, maxLen))
  }

  for (const desc of chunks) {
    embed.setDescription(desc.join(''))

    await message.channel.send({
      embeds: [embed]
    })
  }
}