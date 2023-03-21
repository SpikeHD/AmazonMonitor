import { EmbedBuilder } from 'discord.js'

export default {
  type: 'view',
  run
}

async function run(cfg, guild, message) {
  let embed = new EmbedBuilder()
    .setTitle('AmazonMonitor: Commands and Help')
    .setDescription('This will describe each function and what it does.\n Some commands take a hot second, but 90% of the time it isn\'t broken, so don\'t worry')
    .setColor('Red')

  let fields = []

  cfg.commands.forEach(c => {
    if (c.name) fields.push({
      name: cfg.prefix + c.name,
      value: `${c.desc}\n**Usage: ${cfg.prefix + c.usage}**`
    })
  })

  message.channel.send(embed)
}