import Discord, { Partials } from 'discord.js'
import fs from 'fs'
import * as debug from './common/debug.js'
import { initBrowser } from './common/browser.js'
import { startWatcher } from './common/watcher.js'

declare global {
  var browser: import('puppeteer').Browser
}

const __dirname = import.meta.url.split('/').slice(0, -1).join('/')

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

const config: Config = JSON.parse(fs.readFileSync('./config.json').toString())
const commands = new Discord.Collection()

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

  by SpikeHD
  ##########################################################################
  `)

  if (config.prefix.length > 3) debug.log('Your prefix is more than 3 characters long. Are you sure you set it properly?', 'warn')
  if (config.prefix.length === 0) debug.log('You do not have a prefix set, you should definitely set one.', 'warn')

  if (config.minutes_per_check < 1) {
    debug.log('You have set minutes_per_check to something lower than a minute. This can cause the bot to start new checks before the previous cycle has finshed.', 'warn', true)
    debug.log('If you experience heightened RAM usage, CPU usage, or general slowness, bring this value back up a reasonable amount.', 'warn', true)
    debug.log('This message is not an error, and the bot is still running.', 'warn', true)
  }

  if (__dirname.indexOf(' ') !== -1) {
    debug.log('The current path the bot resides in contains spaces. Please move it somewhere that does not contain spaces.', 'error', true)
    process.exit()
  }

  // Read all files in commands/ and add them to the commands collection
  for (const command of fs.readdirSync('./commands/')) {
    const cmd = await import(`./commands/${command}`)

    debug.log(`Loaded command ${cmd.default.name}`, 'info')

    commands.set(cmd.default.name, cmd)
  }

  // Initialize the globally accessible browser
  initBrowser()

  startWatcher(bot)

  debug.log('Bot is ready!', 'info')
})

bot.on('messageCreate', function (message) {
  if (message.author.bot || !message.content.startsWith(config.prefix)) return

  const command = message.content.split(config.prefix)[1].split(' ')[0],
    args = message.content.split(' '),
    // @ts-expect-error This is fine, it's just how the import works
    cmd = commands.get(command)?.default

  if (cmd) {
    if (cmd.name === 'help') {
      cmd.run(bot, message, commands)
      return
    }

    switch(cmd.type) {
    case 'view': exec(message, args, cmd)
      break
    case 'edit':
      if (message.member.permissions.has(config.required_perms)) exec(message, args, cmd)
      break
    }
  }
})

async function exec(message: Discord.Message, args: string[], cmd: Command) {
  const ch = await message.channel.fetch()
  ch.sendTyping()

  await cmd.run(bot, message, args).catch((e: Error) => {
    message.channel.send(e.message)
    debug.log(e, 'error')
  })
}
