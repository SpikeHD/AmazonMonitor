const { MessageEmbed } = require('discord.js')
const { getWatchlist, removeWatchlistItem } = require('../common/data') 

module.exports = {
  name: "unwatch",
  desc: "Removes from the watchlist using at number. If no number is provided, returns the watchlist",
  usage: "unwatch [number]",
  type: "edit"
}

module.exports.run = (bot, guild, message, args) => {
  return new Promise(async (resolve, reject) => {
    var existing = bot.watchlist.filter(x => x.guild_id === message.guild.id)
    var localIndex
    if(!args[1]) {
      message.channel.send(`Use \`${bot.prefix}unwatch [num]\` to unwatch one of the following links`)
      message.channel.startTyping()
      await bot.commands.get('watchlist').run(bot, message.guild, message, args).catch(e => {
        console.log(e)
      })
      message.channel.stopTyping(true)
    } else {
      if(!parseInt(args[1])) reject('Invalid number/item')
      var index = parseInt(args[1])

      getWatchlist().then(rows => {
        if (!rows || rows.length == 0) reject('No existing items!')
        var item = rows[index-1]
        
        if(!item) reject('Not an existing item!')
        else {
          removeWatchlistItem(item.link).then(() => {
            existing.forEach(itm => {
              var asin = itm.link.split("/dp/")[1].match(/^[a-zA-Z0-9]+/)[0]
              if (itm.link.includes(asin)) {
                localItem = bot.watchlist.indexOf(itm)
              }
            })

            bot.watchlist.splice(localIndex, 1)
            resolve(message.channel.send('Successfully removed item: ' + item.link))
          })
        }
      })
    }
  })
}