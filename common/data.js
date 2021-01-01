const fs = require('fs')
const watchFile = './watchlist.json'

// Setup
;(function () {
  if (!fs.existsSync(watchFile) || !JSON.parse(fs.readFileSync(watchFile))) fs.writeFileSync(watchFile, '[]', 'utf-8')
})()

/**
 * Retrieve watchlist.
 */
exports.getWatchlist = async () => {
  return JSON.parse(fs.readFileSync(watchFile))
}

/**
 * Add new item.
 */
exports.addWatchlistItem = async (obj) => {
  const data = JSON.parse(fs.readFileSync(watchFile))
  data.push(obj)
  fs.writeFileSync(watchFile, JSON.stringify(data), 'utf-8')
}

/**
 * Remove item.
 */
exports.removeWatchlistItem = async (bot, link) => {
  const data = JSON.parse(fs.readFileSync(watchFile))
  const item = data.find(x => x.link === link || (x.query && x.query === link))
  if (item) data.splice(data.indexOf(item), 1)
  fs.writeFileSync(watchFile, JSON.stringify(data), 'utf-8')
  bot.watchlist.splice(bot.watchlist.indexOf(item), 1)
}

/**
 * Update item.
 */
exports.updateWatchlistItem = async (obj, condition) => {
  let data = JSON.parse(fs.readFileSync(watchFile))
  /**
   * The stuff ahead doesn't make a lot of sense so I'll try my best to explain:
   */
  data = data.map(x => {
    let matches = true

    /**
     * The condition param is an object (key/value pairs) containing
     * which fields need to equal which values. This first loop verifies
     * these
     * 
     * If the condition object is:
     * 
     * {
     *    "link":"https://mylink.com/"
     * }
     * 
     * then x[c] will be the value of the "link" field in our data (it could be anything),
     * and condition[c] will be the "link" field in the condition ("https://mylink.com/").
     * We then compare the two to make sure they match.
     */
    Object.keys(condition).forEach(c => {
      if (x[c] != condition[c]) matches = false
    })

    if (matches) {
      /**
       * This second loop 
       */
      Object.keys(obj).forEach(i => {
        x[i] = obj[i]
      })
    }

    return x
  })
  fs.writeFileSync(watchFile, JSON.stringify(data, null, 2), 'utf-8')
}