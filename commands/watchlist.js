const { MessageEmbed } = require('discord.js')
const { trim } = require('../common/util')

module.exports = {
  run: (b, g, m, a) => run(b, g, m, a),
  name: "watchlist",
  desc: "Display a list of each Amazon link currenty being watched in this server",
  usage: "watchlist"
}

function run(bot, guild, message, args) {
  return new Promise((resolve, reject) => {
    bot.con.query(`SELECT * FROM watchlist WHERE guild_id=?`, [guild.id], (err, rows) => {
      if (err) reject(err)
      var links = rows.map((x, i) => `${i+1}. ${trim(x.item_name, 100)}\n${x.link.substring(0, x.link.lastIndexOf('/')) + '/'}`)
      var embed = new MessageEmbed()
        .setTitle('List of Amazon items currently being watched')
        .setDescription(links.join('\n\n'))
        .setColor('BLUE')
        .setFooter(`Currently watching ${rows.length} links in this server`)

      resolve(message.channel.send(embed))
    })
  })
}