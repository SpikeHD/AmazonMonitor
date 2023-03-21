import fs from 'fs'
import chalk from 'chalk'

const { debug_enabled } = JSON.parse(fs.readFileSync('./config.json').toString())

export function log(message, type = 'debug', override = false) {
  let t
  /* eslint-disable indent */
  switch(type.toLowerCase()) {
    default:
    case 'log': t = chalk.blue('[LOG] ')
      break
    case 'debug': t = chalk.green('[DEBUG] ')
      break
    case 'warn': t = chalk.yellow('[WARNING] ')
      break
    case 'error': t = chalk.red('[ERROR] ')
      break
    case 'info': t = chalk.magenta('[MESSAGE] ')
  }

  if(debug_enabled || override) console.log(t, message)
}