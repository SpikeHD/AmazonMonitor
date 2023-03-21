import fs from 'fs'
import { EmbedBuilder } from 'discord.js'
import { trim } from '../common/util.js'
import * as amazon from '../common/Amazon.js'

const { tld, search_response_ms } = JSON.parse(fs.readFileSync('./config.json').toString())

export default {
  name: 'search',
  desc: 'Search and return the top 10 items using a search term',
  usage: 'search [search term]',
  type: 'view',
  run
}

async function run(cfg, guild, message, args) {
  args.splice(0, 1)
  let phrase = args.join(' ')

  cfg.debug.log('Search phrase: ' + phrase, 'debug')

  let embed = new EmbedBuilder()
    .setColor('Orange')
    .setTitle(`Search results for phrase: ${phrase}`)
    .setDescription(`(respond with **${cfg.prefix}[num]** to get the full link and some additional details, or **${cfg.prefix}quickwatch [num]** to quick-watch an item)`)

  // Search using term
  let item = await amazon.find(cfg, phrase, tld).catch(e => {
    console.log(e)
  })
  let fields = []
  
  if (item) {
    item.forEach((r, n) => {
      // Add an embed field for each item
      fields.push({
        name: `[${n+1}] ${trim(r.full_title, 70)}`,

        // @ts-expect-error test
        value: `${!r.ratings.length <= 1 ? r.ratings:'no ratings'} | ${r.price !== '' ? r.price:'none/not in stock'}`
      })
    })
  }

  const m = await message.channel.send(embed)
  // Message must be from original author and in the same channel
  let filter = (msg => msg.author.id === message.author.id &&
    msg.channel.id === message.channel.id &&
    msg.member.hasPermission(cfg.required_perms))

  cfg.debug.log('Watching for messages...', 'debug')

  const col = await m.channel.awaitMessages(filter, {
    max: 1,
    time: search_response_ms || 30000
  })
  // If a message was sent and it start with the prefix
  if (col.first() && col.first().content.startsWith(cfg.prefix)) {
    // Parse the actual command part
    let command = col.first().content.split(cfg.prefix)[1].split(' ')[0]
    if (command) {
      let link

      cfg.debug.log('I parsed this as a command: ' + command, 'debug')

      // If the "command" is just a number, we assume that they want details on that number in the list
      if (parseInt(command)) {
        link = item[parseInt(command) - 1].full_link

        cfg.debug.log(link, 'info')

        // Execute the 'details' command
        message.channel.startTyping()

        await cfg.commands.get('details')?.default.run(cfg, message.guild, m, [command, link]).catch(e => {
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
          await cfg.commands.get('watch').run(cfg, message.guild, m, [command, '-l', link]).catch(e => {
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
