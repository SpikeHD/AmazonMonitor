const { MessageEmbed } = require('discord.js')
const amazon = require('../common/Amazon')

module.exports = {
  run: (b, g, m, a) => run(b, g, m, a)
}

function run(bot, guild, message, args) {
  args.splice(0, 1)
  var phrase  = args.join(' ')

  var embed = new MessageEmbed()
    .setColor('ORANGE')
    .setTitle(`Search results for phrase: ${phrase}`)
    .setDescription(`(respond with **${bot.prefix}[num]** to get the full link and some additional details, or **${bot.prefix}quickwatch [num]** to quick-watch an item)`)
  
  // Search using term
  amazon.find(phrase).then((res) => {
    var n = 1
    res.forEach(r => {
      embed.addField(`[${n}] ${trim(r.title)}`, `${!r.ratings.length < 2 ? r.ratings:'no ratings'} | ${r.price !== '' ? r.price:'none'}`)
      n++
    })

    message.channel.send(embed).then(m => {
      var filter = (msg => msg.author.id === message.author.id &&
        msg.channel.id === message.channel.id &&
        msg.content.startsWith(bot.prefix))
      
      m.channel.awaitMessages(filter, {limit: 1, time: 30000}).then(col => {
        if (command) {
          var link = amazon.getLink(res[parseInt(command)].prod_code, 'ca')
          var command = col.content.split(prefix)[1].split(" ")[0]
          
          switch (command) {
            case 'quickwatch':
              bot.commands.get('watch').run(bot, message.guild, m, [command, link])
              break
            case parseInt(command):
              bot.commands.get('details').run(bot, message.guild, m, [command, link])
              break
            default: return
          }
        }
      })
    })
  })
}

function trim(s) {
  if(s.length > 70) {
    return s.substr(0, 70) + '...'
  } else return s
}