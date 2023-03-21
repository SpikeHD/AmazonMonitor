import { EmbedBuilder, Guild, Message } from 'discord.js'
import * as amazon from'../common/Amazon.js'

export default {
  name: 'details',
  desc: 'Return details using an amazon link',
  usage: 'details [amazon link]',
  type: 'view',
  run
}

async function run(cfg, guild: Guild, message: Message, args) {
  let asin: string
  let tld: string

  // Try to see if there is a valid asin
  try {
    asin = args[1].split('/dp/')[1] || args[1].split('/gp/product/')[1]
    asin = asin.match(/^[a-zA-Z0-9]+/)[0]
    tld = args[1].split('amazon.')[1].split('/')[0]
  } catch (e) {
    return cfg.debug.log(e, 'warning')
  }

  let item = await amazon.details(cfg, `https://www.amazon.${tld}/dp/${asin.replace(/[^A-Za-z0-9]+/g, '')}/`).catch(() => {
    return 'Got an error retrieving the Amazon item'
  })

  // Replace empty values
  Object.keys(item).forEach(k => {
    if (!item[k] ||
      item[k].length < 1) item[k] = 'none'
  })

  console.log(item)

  let embed = new EmbedBuilder()
    .setColor('Orange')
    .setTitle(item.full_title)
    .setAuthor({
      name: item.seller.includes('\n') ? 'invalid' : item.seller,
    })
    .setImage(item.image)
    .setDescription(`${item.full_link}\n${item.features != 'none' ? item.features.join('\n\n'):''}`)
    .addFields([{
      name: 'Price',
      value: item.symbol + item.price,
      inline: true
    },
    {
      name: 'Rating',
      value: item.rating,
      inline: true
    },
    {
      name: 'Shipping',
      value: item.shipping,
      inline: true
    },
    {
      name: 'Availability',
      value: item.availability,
      inline: true
    }
    ])

  message.channel.send({
    embeds: [embed]
  })
}