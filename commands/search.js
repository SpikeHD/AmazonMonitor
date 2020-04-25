const { MessageEmbed } = require('discord.js')
const amazon = require('../common/Amazon')

module.exports = {
  run: (b, g, m, a) => run(b, g, m, a)
}

function run(bot, guild, message, args) {
  return new Promise((resolve, reject) => {
    args.splice(0, 1)
    var phrase  = args.join(' ')
  
    var embed = new MessageEmbed()
      .setColor('ORANGE')
      .setTitle(`Search results for phrase: ${phrase}`)
      .setDescription(`(respond with **${bot.prefix}[num]** to get the full link and some additional details, or **${bot.prefix}quickwatch [num]** to quick-watch an item)`)
    
    // Search using term
    amazon.find(bot, phrase, '.ca').then((res) => {
      var n = 1
      res.forEach(r => {
        embed.addField(`[${n}] ${trim(r.title)}`, `${!r.ratings.length <= 1 ? r.ratings:'no ratings'} | ${r.price !== '' ? r.price:'none/not in stock'}`)
        n++
      })
  
      message.channel.send(embed).then(m => {
        var filter = (msg => msg.author.id === message.author.id &&
          msg.channel.id === message.channel.id)
        
        m.channel.awaitMessages(filter, { max: 1, time: 20000 }).then(col => {
          if (col.first() && col.first().content.startsWith(bot.prefix)) {
            var command = col.first().content.split(bot.prefix)[1].split(' ')[0]
            if (command) {
              var link;
  
              if (parseInt(command)) {
                link = res[parseInt(command)-1].prod_link
                message.channel.startTyping()
                resolve(bot.commands.get('details').run(bot, message.guild, m, [command, link]).then(() => {
                  message.channel.stopTyping(true)
                }).catch(e =>  {
                  console.log(e)
                  message.channel.stopTyping(true)
                }))
              } else {
                switch (command) {
                  case 'quickwatch':
                    link = res[parseInt(col.first().content.split(' ')[1])-1].prod_link
                    message.channel.startTyping()
                    bot.commands.get('watch').run(bot, message.guild, m, [command, link]).then(() => {
                      message.channel.stopTyping(true)
                    }).catch(e =>  {
                      console.log(e)
                      message.channel.stopTyping(true)
                    })
                    break
                  default:
                    break
                }
                resolve()
              }
            }
          } else resolve()
        })
      })
    }).catch(e => {
      console.log(e)
      reject(message.channel.send('I encountered an error while trying to process that URL. Was it correct?'))
    })
  })
}

function trim(s) {
  if(s.length > 70) {
    return s.substr(0, 70) + '...'
  } else return s
}