const util = require('./common/util')
const Discord = require("discord.js");
const bot = new Discord.Client();
const fs = require("fs");
const mysql = require('mysql');
var { prefix, token, sql } = require("./config.json");
bot.commands = new Discord.Collection()

bot.login(token)

// Establish Connection to SQL
const con = mysql.createPool({
  connectionLimit: 100,
  host: sql.host,
  user: sql.user,
  password: sql.password,
  database: sql.database,
  charset: "utf8mb4"
});

bot.on('ready', function () {
  bot.prefix = prefix
  bot.con = con
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
      console.log(`Loading command: ${command}`)

      let props = require(`./commands/${command}`)
      bot.commands.set(command.replace('.js', ''), props);
  });

  // Populate watchlist
  bot.con.query(`SELECT guild_id, channel_id, link FROM watchlist`, (err, rows) => {
    if(err) throw err
    bot.watchlist = Object.values(JSON.parse(JSON.stringify(rows)))
  })

  util.startPup()
});

bot.on('message', function (message) {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  var command = message.content.split(prefix)[1].split(" ")[0],
    args = message.content.split(' '),
    cmd = bot.commands.get(command)

  if (cmd) cmd.run(bot, message.guild, message, args);
});