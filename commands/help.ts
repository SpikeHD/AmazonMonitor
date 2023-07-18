import { Client, EmbedBuilder, EmbedField, Message } from 'discord.js'
import fs from 'fs'

export default {
  type: 'view',
  name: 'help',
  run
}

async function run(bot: Client, message: Message, commands: { default: Command }[]) {
  const config: Config = JSON.parse(fs.readFileSync('./config.json').toString())
  const embed = new EmbedBuilder()
    .setTitle('AmazonMonitor: Commands and Help')
    .setDescription('This will describe each function and what it does.\n Some commands take a hot second, but 90% of the time it isn\'t broken, so don\'t worry')
    .setColor('Red')

  const fields: EmbedField[] = []
  commands.forEach(cmd  => {
    const c = cmd.default
    
    if (c.name && c.name !== 'help') fields.push({
      name: config.prefix + c.name,
      value: `${c.description}\n**Usage: ${config.prefix + c.usage}**`,
      inline: false
    })
  })

  embed.addFields(fields)

  message.channel.send({
    embeds: [embed]
  })
}