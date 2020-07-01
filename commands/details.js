const { MessageEmbed } = require('discord.js')
const ebay = require('../common/Checkaflip')
const amazon = require('../common/Amazon')
const {ebayAverage} = require('../config.json')
const util = require('../common/util')

module.exports = {
  name: "details",
  desc: "Return details using an amazon link",
  usage: "details [amazon link]",
  type: "view"
}

module.exports.run = (bot, guild, message, args) => {
  return new Promise(async (resolve, reject) => {
    var asin;
    var tld;
  
    // Try to see if there is a valid asin
    try {
      asin = args[1].split("/dp/")[1].match(/^[a-zA-Z0-9]+/)[0]
      tld = args[1].split('amazon.')[1].split('/')[0]
    } catch(e) {
      reject('Not a valid link')
    }

    var item = await amazon.details(bot, `https://www.amazon.${tld}/dp/${asin.replace(/[^A-Za-z0-9]+/g, '')}/`).catch(e => {
      console.log(e)
      reject('Got an error retrieving the Amazon item')
    })
      
    // Replace empty values
    Object.keys(item).forEach(k => {
      if(!item[k] ||
        item[k].length <= 1) item[k] = 'none'
    })

    var embed = new MessageEmbed()
      .setColor('ORANGE')
      .setTitle(item.full_title)
      .setAuthor(item.seller.includes('\n') ? 'invalid':item.seller)
      .setImage(item.image)
      .setDescription(`${item.full_link}\n${item.features != 'none' ? item.features.join('\n\n'):''}`)
      .addField('Price', item.price, true)
      .addField('Rating', item.rating, true)
      .addField('Shipping', item.shipping, true)
      .addField('Availability', item.availability)

    if(ebayAverage) {
      const lim = 5
      const ebayItems = await ebay.getEbayAverage(item.full_title, lim)
      var ebayAvg = 0

      ebayItems.forEach(r => ebayAvg += r.itemCurrentPrice)
      ebayAvg = (ebayAvg/lim).toFixed(2)

      embed.addField('Average price compared to top 5 eBay results', `$${ebayAvg}`)
    }

    resolve(message.channel.send(embed))
  })
}