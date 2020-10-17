const Discord = require('discord.js');
const bot = new Discord.Client();
const fs = require('fs');
const mysql = require('mysql');
const debug = require('./common/debug')
var config = require("./config.json");
bot.commands = new Discord.Collection()
bot.itemLimit = config.guild_item_limit

bot.login(config.token)

bot.on('ready', function () {
  bot.util = require('./common/util')
  bot.debug = debug
  bot.proxylist = fs.existsSync('./proxylist.txt')
  bot.required_perms = config.required_perms
  bot.URLParams = config.URLParams || {}
  bot.prefix = config.prefix
  const str = `
  ##########################################################################
   _____                                        __      __         __         .__                  
  /  _  \\   _____ _____  ____________   ____   /  \\    /  \\_____ _/  |_  ____ |  |__   ___________ 
 /  /_\\  \\ /     \\\\__  \\ \\___   /  _ \\ /    \\  \\   \\/\\/   /\\__  \\\\   __\\/ ___\\|  |  \\_/ __ \\_  __ \\
/    |    \\  Y Y  \\/ __ \\_/    (  <_> )   |  \\  \\        /  / __ \\|  | \\  \\___|   Y  \\  ___/|  | \\/
\\____|__  /__|_|  (____  /_____ \\____/|___|  /   \\__/\\  /  (____  /__|  \\___  >___|  /\\___  >__|   
        \\/      \\/     \\/      \\/          \\/         \\/        \\/          \\/     \\/     \\/       

  by SpikeGD#3336
  ##########################################################################
  `

  console.log(str);

  // Load commands
  fs.readdirSync("./commands/").forEach(command => {
      debug.log(`Loading command: ${command}`, 'info')

      let props = require(`./commands/${command}`)
      bot.commands.set(command.replace('.js', ''), props);
  });

  // Start services
  bot.util.startPup()
  bot.util.startWatcher(bot)

  debug.log(`Data storage type: ${!config.storage_type ? 'json':config.storage_type}`, 'DEBUG')
});

bot.on('message', function (message) {
  if (message.author.bot) return;
  if (!message.content.startsWith(config.prefix)) return;

  var command = message.content.split(config.prefix)[1].split(" ")[0],
    args = message.content.split(' '),
    cmd = bot.commands.get(command)

  if (cmd) {
    switch(cmd.type) {
      case "view": exec(bot, message, args, cmd)
      break;
      case "edit":
        if (message.member.hasPermission(bot.required_perms)) exec(bot, message, args, cmd)
      break;
    }
  }
});

async function exec(bot, message, args, cmd) {
  message.channel.startTyping()
  await cmd.run(bot, message.guild, message, args).catch(e => {
    message.channel.send(e)
    debug.log(e, 'error')
  })
  message.channel.stopTyping(true)
}