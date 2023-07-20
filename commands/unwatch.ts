import { Client, Message } from 'discord.js'
import { getWatchlist, removeWatchlistItem } from '../common/watchlist.js'

export default {
  name: 'unwatch',
  description: 'Removes from the watchlist using at number. If no number is provided, returns the watchlist',
  usage: 'unwatch [number]',
  type: 'edit',
  run
}

async function run(bot: Client, message: Message, args: string[]) {
  if (!parseInt(args[1])) return message.channel.send('Invalid number/item')

  const index = parseInt(args[1])
  const rows = await getWatchlist()

  if (!rows || rows.length == 0) return message.channel.send('No existing items in the watchlist to remove!')

  const item = rows[index - 1]

  if (!item) return message.channel.send('Not an existing item!')

  if (item.type === 'link') {
    // @ts-ignore
    await removeWatchlistItem(item.link)
    // @ts-ignore
    message.channel.send('Successfully removed item: ' + item.link)
    return
  }

  if (item.type === 'query') {
    // @ts-ignore
    await removeWatchlistItem(item.query)
    // @ts-ignore
    message.channel.send('Successfully removed item: ' + item.query)
    return
  }
}