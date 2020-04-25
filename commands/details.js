const { MessageEmbed } = require('discord.js')
const amazon = require('../common/Amazon')

module.exports = {
  run: (b, g, m, a) => run(b, g, m, a)
}

function run(bot, guild, message, args) {
  return new Promise((resolve, reject) => {
    amazon.details(bot, args[1]).then(res => {
      // Replace empty values
      Object.keys(res).forEach(k => {
        if(!res[k] ||
          res[k].length <= 1) res[k] = 'none'
      })
  
      var embed = new MessageEmbed()
        .setColor('ORANGE')
        .setTitle(res.full_title)
        .setAuthor(res.seller.includes('\n') ? 'invalid':res.seller)
        .setImage(res.image)
        .setDescription(`${res.full_link}\n${res.features != 'none' ? res.features.join('\n\n'):''}`)
        .addField('Price', res.price, true)
        .addField('Rating', res.rating, true)
        .addField('Shipping', res.shipping, true)
        .addField('Availability', res.availability)
  
      resolve(message.channel.send(embed))
    }).catch(e => {
      console.log(e)
      reject(e)
    })
  })
}