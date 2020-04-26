const { MessageEmbed } = require('discord.js')
const amazon = require('../common/Amazon')

module.exports = {
  run: (b, g, m, a) => run(b, g, m, a),
  name: "search",
  desc: "Search and return the top 10 items using a search term",
  usage: "search [search term]"
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
    amazon.find(bot, phrase, '.com').then((res) => {
      var n = 1
      res.forEach(r => {
        // Add an embed field for each item
        embed.addField(`[${n}] ${trim(r.title)}`, `${!r.ratings.length <= 1 ? r.ratings:'no ratings'} | ${r.price !== '' ? r.price:'none/not in stock'}`)
        n++
      })
  
      message.channel.send(embed).then(m => {
        // Message must be from original author and in the same channel
        var filter = (msg => msg.author.id === message.author.id &&
          msg.channel.id === message.channel.id)
        
        m.channel.awaitMessages(filter, { max: 1, time: 20000 }).then(col => {
          // If a message was sent and it start with the prefix
          if (col.first() && col.first().content.startsWith(bot.prefix)) {
            // Parse the actual command part
            var command = col.first().content.split(bot.prefix)[1].split(' ')[0]
            if (command) {
              var link;
              
              // If the "command" is just a number, we assume that they want details on that number in the list
              if (parseInt(command)) {
                link = res[parseInt(command)-1].prod_link

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
      reject(message.channel.send('I encountered an error while trying to process that URL. Was it correct?'))
    })
  })
}

function trim(s) {
  if(s.length > 70) {
    return s.substr(0, 70) + '...'
  } else return s
}