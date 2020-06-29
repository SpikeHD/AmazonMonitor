const { MessageEmbed } = require('discord.js')
const { trim } = require('../common/util')
const amazon = require('../common/Amazon')
const {tld} = require('../config.json')

module.exports = {
  name: "search",
  desc: "Search and return the top 10 items using a search term",
  usage: "search [search term]",
  type: "view"
}

module.exports.run = (bot, guild, message, args) => {
  return new Promise((resolve, reject) => {
    args.splice(0, 1)
    var phrase  = args.join(' ')

    bot.debug.log('Search phrase: ' + phrase, 'debug')
  
    var embed = new MessageEmbed()
      .setColor('ORANGE')
      .setTitle(`Search results for phrase: ${phrase}`)
      .setDescription(`(respond with **${bot.prefix}[num]** to get the full link and some additional details, or **${bot.prefix}quickwatch [num]** to quick-watch an item)`)
    
    // Search using term
    amazon.find(bot, phrase, tld).then((res) => {
      var n = 1
      res.forEach(r => {
        // Add an embed field for each item
        embed.addField(`[${n}] ${trim(r.title, 70)}`, `${!r.ratings.length <= 1 ? r.ratings:'no ratings'} | ${r.price !== '' ? r.price:'none/not in stock'}`)
        n++
      })
  
      message.channel.send(embed).then(m => {
        // Message must be from original author and in the same channel
        var filter = (msg => msg.author.id === message.author.id &&
          msg.channel.id === message.channel.id &&
          msg.member.hasPermission(bot.required_perms))
        
        bot.debug.log('Watching for messages...', 'debug')

        m.channel.awaitMessages(filter, { max: 1, time: 20000 }).then(col => {
          // If a message was sent and it start with the prefix
          if (col.first() && col.first().content.startsWith(bot.prefix)) {
            // Parse the actual command part
            var command = col.first().content.split(bot.prefix)[1].split(' ')[0]
            if (command) {
              var link;

              bot.debug.log('I parsed this as a command: ' + command, 'debug')
              
              // If the "command" is just a number, we assume that they want details on that number in the list
              if (parseInt(command)) {
                link = res[parseInt(command)-1].prod_link

                console.log(link)

                // Execute the 'details' command
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

                    // Execute the 'watch' command
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
      // Generic "I'm bad therefore I failed" message
      reject(e)
    })
  })
}
