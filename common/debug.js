const colors = require('colors')
const { debugEnabled } = require('../config.json')

exports.log = (message, type) => {
  let t;
  switch(type.toLowerCase()) {
    default:
    case "log": t = "[LOG] ".blue
    break
    case "debug": t = "[DEBUG] ".green
    break
    case "warn": t = "[WARNING] ".yellow
    break
    case "error": t = "[ERROR] ".red
    break
    case "info": t = "[MESSAGE] ".magenta
  }

  if(debugEnabled) console.log(t, message)
}