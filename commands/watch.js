const { MessageEmbed } = require('discord.js')
const amazon = require('../common/Amazon')

module.exports = {
  run: (b, g, m, a) => run(b, g, m, a)
}

function run(bot, guild, message, args) {
  return new Promise((resolve, reject) => {
    // Get an array of all existing entrie to make sure we don't have a duplicate
    var existing = bot.watchlist.filter(x => x.guild_id === message.guild.id)
    var asin;
    var exists = false
  
    // Compare asins for duplicate
    try {
      asin = args[1].split("/dp/")[1].split("/")[0]
    } catch(e) {
      resolve(message.channel.send('Not a valid link'))
    }
  
    // If there isn't one, it's probably just a bad URL
    if (!asin) message.channel.send('Not a valid link')
    else {
      // Loop through existing entries, check if they include the asin somewhere
      existing.forEach(itm => {
        if (itm.link.includes(asin)) {
          exists = true
        }
      })
    }
  
    if(exists) resolve(message.channel.send('I\'m already watching that link somewhere else!'))
  
    amazon.details(bot, args[1]).then(item => {
      var values = [guild.id, message.channel.id, item.full_link, (parseFloat(item.price.split(" ")[1] || 0))]

      // Push the values to the database
      bot.con.query(`INSERT INTO watchlist (guild_id, channel_id, link, lastPrice) VALUES (?, ?, ?, ?)`, values, (err) => {
        if (err) throw err
        // Also add it to the existing watchlist obj so we don't have to re-do the request that gets them all
        bot.watchlist.push({
          guild_id: values[0],
          channel_id: values[1],
          link: values[2],
          lastPrice: values[3]
        })
  
        resolve(message.channel.send(`Now watching "${item.full_title}", I'll send updates in this channel from now on!`))
      })
    }).catch(e => reject(e))
  })
}
