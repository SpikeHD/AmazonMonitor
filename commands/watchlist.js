const { MessageEmbed, Util } = require('discord.js')
const { trim } = require('../common/util')
const { getWatchlist } = require('../common/data')

module.exports = {
  name: 'watchlist',
  desc: 'Display a list of each Amazon link currenty being watched in this server',
  usage: 'watchlist',
  type: 'view'
}

module.exports.run = async (bot, guild, message) => {
  getWatchlist().then(async rows => {
    let links = rows.map((x, i) => {
      if (x.type === 'link') return `${i+1}. ${trim(x.item_name, 100)}\n${x.link.substring(0, x.link.lastIndexOf('/')) + '/'}${x.priceLimit != 0 ? `\nMust be $${x.priceLimit}`:''}`
      else if (x.type === 'category') return `${i+1}. Category: "${x.name}"`
      else if (x.type === 'query') return `${i+1}. Query: "${x.query}"`
    })

    bot.debug.log('Raw database output:', 'debug')
    bot.debug.log(rows, 'debug')

    let embed = new MessageEmbed()
      .setTitle('List of Amazon items currently being watched')
      .setColor('BLUE')
      .setFooter(`Currently watching ${rows.length} items in this server`)

    const description = links.length > 0 ? links.join('\n\n') : 'You haven\'t added any items yet!'
    const splitDescriptions = Util.splitMessage(description, { maxLength: 2048 })

    for (const desc of splitDescriptions) {
      embed.setDescription(desc)
      await message.channel.send(embed)
    }
  })
}