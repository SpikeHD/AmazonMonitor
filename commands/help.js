const { MessageEmbed } = require('discord.js')

module.exports = {
  run: (b, g, m, a) => run(b, g, m, a),
  type: "view"
}

function run(bot, guild, message, args) {
  return new Promise((resolve, reject) => {
    var embed = new MessageEmbed()
      .setTitle('AmazonMonitor: Commands and Help')
      .setDescription('This will describe each function and what it does.\n Some commands take a hot second while, but 90% of the time it isn\'t broken, so don\'t worry')
      .setColor('RED')
    
    bot.commands.forEach(c => {
      if(c.name) embed.addField(bot.prefix + c.name, `${c.desc}\n**Usage: ${bot.prefix + c.usage}**`)
    })

    resolve(message.channel.send(embed))
  })
}