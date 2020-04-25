const { MessageEmbed } = require('discord.js')
const amazon = require('../common/Amazon')

module.exports = {
  run: (b, g, m, a) => run(b, g, m, a)
}

function run(bot, guild, message, args) {
  amazon.details(bot, args[1]).then(res => {
    // Replace empty values
    Object.keys(res).forEach(k => {
      if(res[k].length <= 1) res[k] = 'none'
    })

    var embed = new MessageEmbed()
      .setColor('ORANGE')
      .setTitle(res.full_title)
      .setAuthor(res.seller)
      .setImage(res.image)
      .setDescription(`${res.full_link}\n${res.features.join('\n\n')}`)
      .addField('Price', res.price, true)
      .addField('Rating', res.rating, true)
      .addField('Shipping', res.shipping, true)
      .addField('Availability', res.availability)

    message.channel.send(embed)
  })
}