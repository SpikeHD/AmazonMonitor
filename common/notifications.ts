import { Client, EmbedBuilder } from 'discord.js'
import fs from 'fs'
import { parseParams, priceFormat } from './utils.js'

export async function sendNotifications(bot: Client, notifications: NotificationData[]) {
  const config: Config = JSON.parse(fs.readFileSync('./config.json').toString())

  for (const notif of notifications) {
    // If we have url_params, add them to the URL
    if (Object.keys(config.url_params).length > 0) {
      notif.link += parseParams(config.url_params)
    }

    if (notif.oldPrice === 0 && notif.newPrice !== 0) {
      // Old price was 0 but new price isn't? Item is now in stock!
      await sendInStock(bot, notif)
    }

    // Now we check if the price differences meet all of the provided criteria
    const meetsPriceLimit = notif.priceLimit ? notif.newPrice <= notif.priceLimit : true
    const meetsPricePercentage = notif.pricePercentage ? notif.newPrice < (notif.oldPrice - (notif.oldPrice * (notif.priceLimit / 100))) : true
    const meetsDifference = notif.difference ? notif.newPrice < (notif.oldPrice - notif.difference) : true

    if (meetsPriceLimit && meetsPricePercentage && meetsDifference) {
      await sendPriceChange(bot, notif)
    }
  }
}

export async function sendInStock(bot: Client, notification: NotificationData) {
  const embed = new EmbedBuilder()
    .setTitle(`In-stock alert for "${notification.itemName}"`)
    .setAuthor({
      name: 'AmazonMonitor'
    })
    .setThumbnail(notification.image)
    .setDescription(`New Price: ${notification.symbol} ${notification.newPrice}\n\n${notification.link}`)
    .setColor('Green')
    
  const channel = await bot.channels.fetch(notification.channelId)

  // @ts-ignore This can never be a category channel
  channel.send({ embeds: [embed] })
}

export async function sendPriceChange(bot: Client, notification: NotificationData) {
  const embed = new EmbedBuilder()
    .setTitle(`Price alert for "${notification.itemName}"`)
    .setAuthor({
      name: 'AmazonMonitor'
    })
    .setThumbnail(notification.image)
    .setDescription(`Old Price: ${notification.symbol}${priceFormat(notification.oldPrice)}\nNew Price: ${notification.symbol}${notification.newPrice.toFixed(2) + (
      notification.coupon > 0 ? ` (with ${notification.symbol}${notification.coupon.toFixed(2)} coupon)` : ''
    )}\n\n${notification.link}`)
    .setColor('Green')

  const channel = await bot.channels.fetch(notification.channelId)

  // @ts-ignore This can never be a category channel
  channel.send({ embeds: [embed] })
}