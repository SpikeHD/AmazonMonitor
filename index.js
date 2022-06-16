import Discord from 'discord.js'
const bot = new Discord.Client()
import fs from 'fs'
import * as debug from './common/debug.js'
import { doCheck } from './common/util.js'

const config = JSON.parse(fs.readFileSync('./config.json'))

bot.commands = new Discord.Collection()
bot.itemLimit = config.guild_item_limit

bot.login(config.token)

bot.on('ready', async () => {
  bot.util = await import('./common/util.js')
  bot.debug = debug
  bot.proxylist = fs.existsSync('./proxylist.txt')
  bot.required_perms = config.required_perms
  bot.url_params = config.url_params || {}
  bot.prefix = config.prefix
  const str = `
  ##########################################################################
   _____                                        __      __         __         .__                  
  /  _  \\   _____ _____  ____________   ____   /  \\    /  \\_____ _/  |_  ____ |  |__   ___________ 
 /  /_\\  \\ /     \\\\__  \\ \\___   /  _ \\ /    \\  \\   \\/\\/   /\\__  \\\\   __\\/ ___\\|  |  \\_/ __ \\_  __ \\
/    |    \\  Y Y  \\/ __ \\_/    (  <_> )   |  \\  \\        /  / __ \\|  | \\  \\___|   Y  \\  ___/|  | \\/
\\____|__  /__|_|  (____  /_____ \\____/|___|  /   \\__/\\  /  (____  /__|  \\___  >___|  /\\___  >__|   
        \\/      \\/     \\/      \\/          \\/         \\/        \\/          \\/     \\/     \\/       

  by SpikeHD#3336
  ##########################################################################
  `

  console.log(str)

  // Load commands
  fs.readdirSync('./commands/').forEach(async command => {
    debug.log(`Loading command: ${command}`, 'info')

    let props = await import(`./commands/${command}`)
    bot.commands.set(command.replace('.js', ''), props)
  })

  // Start services
  await bot.util.startPup()
  await bot.util.startWatcher(bot)

  debug.log(`Data storage type: ${!config.storage_type ? 'json':config.storage_type}`, 'DEBUG')

  if (config.minutes_per_check < 1) {
    debug.log('You have set minutes_per_check to something lower than a minute. This can cause the bot to start new checks before the previous cycle has finshed.', 'warn', true)
    debug.log('If you experience heightened RAM usage, CPU usage, or general slowness, bring this value back up a reasonable amount.', 'warn', true)
    debug.log('This message is not an error, and the bot is still running.', 'warn', true)
  }

  // Run initial check when the bot first starts
  doCheck(bot, 0)
})

bot.on('message', function (message) {
  if (message.author.bot) return
  if (!message.content.startsWith(config.prefix)) return

  let command = message.content.split(config.prefix)[1].split(' ')[0],
    args = message.content.split(' '),
    cmd = bot.commands.get(command)?.default

  if (cmd) {
    switch(cmd.type) {
    case 'view': exec(bot, message, args, cmd)
      break
    case 'edit':
      if (message.member.hasPermission(bot.required_perms)) exec(bot, message, args, cmd)
      break
    }
  }
})

async function exec(bot, message, args, cmd) {
  message.channel.startTyping()
  await cmd.run(bot, message.guild, message, args).catch(e => {
    message.channel.send(e)
    debug.log(e, 'error')
  })
  message.channel.stopTyping(true)
}