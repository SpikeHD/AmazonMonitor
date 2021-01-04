const { MessageEmbed } = require('discord.js')
const amazon = require('../common/Amazon')

module.exports = {
  name: 'details',
  desc: 'Return details using an amazon link',
  usage: 'details [amazon link]',
  type: 'view'
}

module.exports.run = async (bot, guild, message, args) => {
  let asin
  let tld

  // Try to see if there is a valid asin
  try {
    asin = args[1].split('/dp/')[1] || args[1].split('/gp/product/')[1]
    asin = asin.match(/^[a-zA-Z0-9]+/)[0]
    tld = args[1].split('amazon.')[1].split('/')[0]
  } catch (e) {
    return bot.debug.log(e, 'warning')
  }

  let item = await amazon.details(bot, `https://www.amazon.${tld}/dp/${asin.replace(/[^A-Za-z0-9]+/g, '')}/`).catch(() => {
    return 'Got an error retrieving the Amazon item'
  })

  // Replace empty values
  Object.keys(item).forEach(k => {
    if (!item[k] ||
      item[k].length < 1) item[k] = 'none'
  })

  let embed = new MessageEmbed()
    .setColor('ORANGE')
    .setTitle(item.full_title)
    .setAuthor(item.seller.includes('\n') ? 'invalid' : item.seller)
    .setImage(item.image)
    .setDescription(`${item.full_link}\n${item.features != 'none' ? item.features.join('\n\n'):''}`)
    .addField('Price', item.symbol + item.price, true)
    .addField('Rating', item.rating, true)
    .addField('Shipping', item.shipping, true)
    .addField('Availability', item.availability)

  message.channel.send(embed)
}