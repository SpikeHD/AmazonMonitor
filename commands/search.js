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

module.exports.run = async (bot, guild, message, args) => {
  args.splice(0, 1)
  let phrase = args.join(' ')

  bot.debug.log('Search phrase: ' + phrase, 'debug')

  let embed = new MessageEmbed()
    .setColor('ORANGE')
    .setTitle(`Search results for phrase: ${phrase}`)
    .setDescription(`(respond with **${bot.prefix}[num]** to get the full link and some additional details, or **${bot.prefix}quickwatch [num]** to quick-watch an item)`)

  // Search using term
  let item = await amazon.find(bot, phrase, tld).catch(e => {
    console.log(e)
  })
  let n = 1
  item.forEach(r => {
    // Add an embed field for each item
    embed.addField(`[${n}] ${trim(r.full_title, 70)}`, `${!r.ratings.length <= 1 ? r.ratings:'no ratings'} | ${r.price !== '' ? r.price:'none/not in stock'}`)
    n++
  })

  const m = await message.channel.send(embed)
  // Message must be from original author and in the same channel
  let filter = (msg => msg.author.id === message.author.id &&
    msg.channel.id === message.channel.id &&
    msg.member.hasPermission(bot.required_perms))

  bot.debug.log('Watching for messages...', 'debug')

  const col = await m.channel.awaitMessages(filter, {
    max: 1,
    time: 20000
  })
  // If a message was sent and it start with the prefix
  if (col.first() && col.first().content.startsWith(bot.prefix)) {
    // Parse the actual command part
    let command = col.first().content.split(bot.prefix)[1].split(' ')[0]
    if (command) {
      let link;

      bot.debug.log('I parsed this as a command: ' + command, 'debug')

      // If the "command" is just a number, we assume that they want details on that number in the list
      if (parseInt(command)) {
        link = item[parseInt(command) - 1].full_link

        bot.debug.log(link, 'info')

        // Execute the 'details' command
        message.channel.startTyping()

        await bot.commands.get('details').run(bot, message.guild, m, [command, link]).catch(e => {
          console.log(e)
        })
        message.channel.stopTyping(true)

        return
      } else {
        switch (command) {
          case 'quickwatch':
            link = item[parseInt(col.first().content.split(' ')[1]) - 1].full_link

            // Execute the 'watch' command
            message.channel.startTyping()
            await bot.commands.get('watch').run(bot, message.guild, m, [command, link]).catch(e => {
              console.log(e)
            })
            message.channel.stopTyping(true)
            break
          default:
            break
        }
        return
      }
    }
  } else return
}
