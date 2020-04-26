const { MessageEmbed } = require('discord.js')

module.exports = {
  run: (b, g, m, a) => run(b, g, m, a)
}

function run(bot, guild, message, args) {
  return new Promise((resolve, reject) => {
    bot.con.query(`SELECT * FROM watchlist WHERE guild_id=?`, [guild.id], (err, rows) => {
      if (err) reject(console.log(err))
      var links = rows.map((x, i) => `${i+1}. ${x.link}`)
      var embed = new MessageEmbed()
        .setTitle('List of Amazon items currently being watched')
        .setDescription(links.join('\n\n'))
        .setColor('BLUE')
        .setFooter(`Currently watching ${rows.length} links in this server`)

      resolve(message.channel.send(embed))
    })
  })
}