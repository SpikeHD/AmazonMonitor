const { MessageEmbed } = require('discord.js')
const { getWatchlist, removeWatchlistItem } = require('../common/data') 

module.exports = {
  name: 'unwatch',
  desc: 'Removes from the watchlist using at number. If no number is provided, returns the watchlist',
  usage: 'unwatch [number]',
  type: 'edit'
}

module.exports.run = async (bot, guild, message, args) => {
  let existing = bot.watchlist.filter(x => x.guild_id === message.guild.id)
  if (!args[1]) {
    message.channel.send(`Use \`${bot.prefix}unwatch [num]\` to unwatch one of the following links`)
    message.channel.startTyping()
    await bot.commands.get('watchlist').run(bot, message.guild, message, args).catch(e => {
      console.log(e)
    })
    message.channel.stopTyping(true)
  } else {
    if (!parseInt(args[1])) return 'Invalid number/item'
    let index = parseInt(args[1])

    getWatchlist().then(rows => {
      if (!rows || rows.length == 0) return 'No existing items!'
      let item = rows[index - 1]

      if (!item) return 'Not an existing item!'
      else {
        removeWatchlistItem(bot, item.link).then(() => {
          existing.forEach(itm => {
            let asin = itm.link.split('/dp/')[1].match(/^[a-zA-Z0-9]+/)[0]
            if (itm.link.includes(asin)) {
              localItem = bot.watchlist.indexOf(itm)
            }
          })
          message.channel.send('Successfully removed item: ' + item.link)
        })
      }
    })
  }
}