/**
 * Central file to handle stored data getting.
 * 
 * This project needs a re-write, but for now I'm just
 * going to slap these methods on and do that later.
 */
var config = require('../config.json')
const fs = require('fs')
const mysql = require('mysql');
const watchFile = '../watchlist.json'

let con = null;

// Setup
(function () {
  // Default type
  if (!config.storage_type) config.storage_type = 'json'

  if (config.storage_type === 'sql') {
    // Establish Connection to SQL
    con = mysql.createPool({
      connectionLimit: 100,
      host: config.sql.host,
      user: config.sql.user,
      password: config.sql.password,
      database: config.sql.database,
      charset: "utf8mb4"
    });
  } else if (config.storage_type === 'json') {
    // Write/fix file on start
    if (!fs.existsSync(watchFile) || !JSON.parse(fs.readFileSync(watchFile))) fs.writeFileSync(watchFile, '[]', 'utf-8')
  } else throw new Error('Invalid storage type (must be \'json\' or \'sql\')')
})();

/**
 * Retrieve watchlist.
 */
exports.getWatchlist = () => {
  return new Promise(resolve => {
    if (config.storage_type === 'sql' && con) {
      con.query(`SELECT * FROM watchlist`, (err, rows) => {
        resolve(rows)
      })
    } else if (config.storage_type === 'json') {
      resolve(JSON.parse(fs.readFileSync(watchFile)))
    }
  })
}

/**
 * Add new item.
 */
exports.addWatchlistItem = async (obj) => {
  if (config.storage_type === 'sql' && con) {
    const res = await con.query(`INSERT INTO watchlist (${Object.keys(obj).toString()} VALUES (${Object.values(obj).toString()}))`)
  } else if (config.storage_type === 'json') {
    const data = JSON.parse(fs.readFileSync(watchFile))
    data.push(obj)
    fs.writeFileSync(watchFile, JSON.stringify(data), 'utf-8')
  }
}

/**
 * Remove item.
 */
exports.removeWatchlistItem = async (link) => {
  if (config.storage_type === 'sql' && con) {
    const res = await con.query(`DELETE FROM watchlist WHERE link=${link}`)
  } else if (config.storage_type === 'json') {
    const data = JSON.parse(fs.readFileSync(watchFile))
    const item = data.find(x => x.link === link)
    if (item) data.splice(data.indexOf(item), 1)
    fs.writeFileSync(watchFile, JSON.stringify(data), 'utf-8')
  }
}

/**
 * Update item.
 */
exports.updateWatchlistItem = async (obj, condition) => {
  if (config.storage_type === 'sql' && con) {
    const res = await con.query(`UPDATE watchlist SET ${objToString(obj, '=', ',')} ${condition ? `WHERE ${objToString(obj, '=', 'AND')}`:''}`)
  } else if (config.storage_type === 'json') {
    const data = JSON.parse(fs.readFileSync(watchFile))
    data = data.map(x => {
      var matches = false

      Object.keys(condition).forEach(c => {
        if (x[c] != condition[c]) matches = false
      })

      if (matches) {
        Object.keys(obj).forEach(i => {
          x[i] = obj[i]
        })
      }

      return x
    })
    fs.writeFileSync(watchFile, JSON.stringify(data), 'utf-8')
  }
}

function objToString(obj, sep, comma) {
  var str = ''

  Object.keys(obj).forEach(k => {
    str += `${k}${sep}${obj[k]}`

    if (Object.keys(obj).length > Object.keys(obj).indexOf(k)+1) str += comma
  })

  return str
}