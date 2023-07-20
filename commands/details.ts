import { EmbedBuilder, Guild, Message } from 'discord.js'
import { linkToAsin, priceFormat } from '../common/utils.js'
import { item } from '../common/amazon.js'

export default {
  name: 'details',
  description: 'Return details using an amazon link',
  usage: 'details [amazon link]',
  type: 'view',
  run
}

async function run(guild: Guild, message: Message, args: string[]) {
  const asin = linkToAsin(args[1])
  const tld = args[1].split('amazon.')[1].split('/')[0]

  if (!asin) {
    message.channel.send('Invalid link')
    return
  }

  const product = await item(`https://www.amazon.${tld}/dp/${asin}`)

  // Hot-replace empty fields
  Object.keys(product).forEach(k => {
    // @ts-ignore This is fine, we aren't interacting with this data
    if (!product[k] || product[k].length < 1) product[k] = 'none'
  })

  const embed = new EmbedBuilder()
    .setColor('Orange')
    .setTitle(product.fullTitle)
    .setAuthor({
      name: product.seller.includes('\n') ? 'invalid' : product.seller,
    })
    .setImage(product.image)
    // @ts-ignore Fine as well
    .setDescription(`${product.fullLink}\n${product.features != 'none' ? product.features.join('\n\n'):''}`)
    .addFields([{
      name: 'Price',
      value: product.symbol + product.price,
      inline: true
    },
    {
      name: 'Rating',
      value: product.rating,
      inline: true
    },
    {
      name: 'Shipping',
      value: product.shipping,
      inline: true
    },
    {
      name: 'Availability',
      value: product.availability,
      inline: true
    }
    ])

  message.channel.send({
    embeds: [embed]
  })
}