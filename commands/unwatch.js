const { MessageEmbed } = require('discord.js')

module.exports = {
  run: (b, g, m, a) => run(b, g, m, a)
}

function run(bot, guild, message, args) {
  return new Promise((resolve, reject) => {
    if(!args[1]) {
      message.channel.send(`Use \`${bot.prefix}unwatch [num]\` to unwatch one of the following links`)
      message.channel.startTyping()
      resolve(bot.commands.get('watchlist').run(bot, message.guild, message, args).then(() => {
        message.channel.stopTyping()
      }).catch(e => {
        message.channel.stopTyping()
        console.log(e)
      }))
    } else {
      if(!parseInt(args[1])) reject(message.channel.send('Invalid number/item'))
      var index = parseInt(args[1])

      bot.con.query(`SELECT * FROM watchlist WHERE guild_id=?`, [guild.id], (err, rows) => {
        if (err) reject(err)
        var item = rows[index-1]
        
        bot.con.query(`DELETE FROM watchlist WHERE guild_id=? AND link=?`, [guild.id, item.link], (err, rows) => {
          if (err) reject(err)
          resolve(message.channel.send('Successfully removed item: ' + item.link))
        })
      })
    }
  })
}