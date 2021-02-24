require('colors')
const { debug_enabled } = require('../config.json')

exports.log = (message, type = 'debug', override = false) => {
  let t
  /* eslint-disable indent */
  switch(type.toLowerCase()) {
    default:
    case 'log': t = '[LOG] '.blue
      break
    case 'debug': t = '[DEBUG] '.green
      break
    case 'warn': t = '[WARNING] '.yellow
      break
    case 'error': t = '[ERROR] '.red
      break
    case 'info': t = '[MESSAGE] '.magenta
  }

  if(debug_enabled || override) console.log(t, message)
}