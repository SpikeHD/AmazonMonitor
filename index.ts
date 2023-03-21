import Discord, { Partials } from 'discord.js'
import fs from 'fs'
import * as debug from './common/debug.js'
import { doCheck } from './common/util.js'

const bot = new Discord.Client({
  intents: [
    'Guilds',
    'GuildMembers',
    'GuildMessages',
    'MessageContent',
  ],
  partials: [
    Partials.Channel,
    Partials.Message
  ]
})
const config = JSON.parse(fs.readFileSync('./config.json').toString())
const cfg = {
  commands: new Discord.Collection(),
  itemLimit: config.guild_item_limit,
  util: null,
  debug: debug,
  proxylist: fs.existsSync('./proxylist.txt'),
  required_perms: config.required_perms,
  url_params: config.url_params || {},
  prefix: config.prefix
}

bot.login(config.token)

bot.on('ready', async () => {
  console.log(`
  ##########################################################################
   _____                                        __      __         __         .__                  
  /  _  \\   _____ _____  ____________   ____   /  \\    /  \\_____ _/  |_  ____ |  |__   ___________ 
 /  /_\\  \\ /     \\\\__  \\ \\___   /  _ \\ /    \\  \\   \\/\\/   /\\__  \\\\   __\\/ ___\\|  |  \\_/ __ \\_  __ \\
/    |    \\  Y Y  \\/ __ \\_/    (  <_> )   |  \\  \\        /  / __ \\|  | \\  \\___|   Y  \\  ___/|  | \\/
\\____|__  /__|_|  (____  /_____ \\____/|___|  /   \\__/\\  /  (____  /__|  \\___  >___|  /\\___  >__|   
        \\/      \\/     \\/      \\/          \\/         \\/        \\/          \\/     \\/     \\/       

  by SpikeHD#3336
  ##########################################################################
  `)

  cfg.util = await import('./common/util.js')

  if (cfg.prefix.length > 3) debug.log('Your prefix is more than 3 characters long. Are you sure you set it properly?', 'warning')
  if (cfg.prefix.length === 0) debug.log('You do not have a prefix set, you should definitely set one.', 'warning')

  // Load commands
  fs.readdirSync('./commands/').forEach(async command => {
    debug.log(`Loading command: ${command}`, 'info')

    let props = await import(`./commands/${command}`)
    cfg.commands.set(command.split('.')[0], props)
  })

  // Start services
  await cfg.util.startPup()
  await cfg.util.startWatcher(bot, cfg)

  debug.log(`Data storage type: ${!config.storage_type ? 'json':config.storage_type}`, 'DEBUG')

  if (config.minutes_per_check < 1) {
    debug.log('You have set minutes_per_check to something lower than a minute. This can cause the bot to start new checks before the previous cycle has finshed.', 'warn', true)
    debug.log('If you experience heightened RAM usage, CPU usage, or general slowness, bring this value back up a reasonable amount.', 'warn', true)
    debug.log('This message is not an error, and the bot is still running.', 'warn', true)
  }

  // Run initial check when the bot first starts
  doCheck(bot, cfg, 0)
})

bot.on('messageCreate', function (message) {
  if (message.author.bot) return
  if (!message.content.startsWith(config.prefix)) return

  let command = message.content.split(config.prefix)[1].split(' ')[0],
    args = message.content.split(' '),
    // @ts-expect-error This is fine, it's just how the import works
    cmd = cfg.commands.get(command)?.default

  if (cmd) {
    switch(cmd.type) {
    case 'view': exec(cfg, message, args, cmd)
      break
    case 'edit':
      if (message.member.permissions.has(cfg.required_perms)) exec(cfg, message, args, cmd)
      break
    }
  }
})

async function exec(cfg, message: Discord.Message, args, cmd) {
  const ch = await message.channel.fetch()
  ch.sendTyping()

  await cmd.run(cfg, message.guild, message, args).catch(e => {
    message.channel.send(e)
    debug.log(e, 'error')
  })
}