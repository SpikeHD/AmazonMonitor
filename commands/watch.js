const { MessageEmbed } = require('discord.js')
const amazon = require('../common/Amazon')

module.exports = {
  run:  (b, g, m, a) => run(b, g, m, a)
}

function run(bot, guild, message, args) {
  //var existing = bot.watchlist[guild.id]
  bot.con.query(`INSERT INTO watchlist (guild_id, channel_id, link) VALUES (?, ?, ?)`,
  [guild.id, message.channel.id, args[1]], (err, rows) => {
    if(err) throw err
    message.channel.send(`Now watching ${args[1]}, I'll send updates in this channel from now on!`)
  })
}