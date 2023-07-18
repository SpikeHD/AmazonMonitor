import fs from 'fs'
const watchFile = './watchlist.json'

interface Conditions {
  [key: string]: string
}

// Setup
(function () {
  if (!fs.existsSync(watchFile) || !JSON.parse(fs.readFileSync(watchFile).toString())) fs.writeFileSync(watchFile, '[]', 'utf-8')
})()

/**
 * Retrieve watchlist.
 */
export const getWatchlist = async () => {
  return JSON.parse(fs.readFileSync(watchFile).toString()) as Watchlist
}

/**
 * Add new item.
 */
export const addWatchlistItem = async (data: LinkItem | CategoryItem | QueryItem) => {
  const watchlist: Watchlist = JSON.parse(fs.readFileSync(watchFile).toString())
  watchlist.push(data)
  fs.writeFileSync(watchFile, JSON.stringify(watchlist), 'utf-8')
}

/**
 * Remove item.
 */
export const removeWatchlistItem = async (url: string) => {
  const watchlist: Watchlist = JSON.parse(fs.readFileSync(watchFile).toString())
  const item = watchlist.find(x => {
    // @ts-ignore TS stupid
    if (x.type === 'link') return x.link === url
    // @ts-ignore
    if (x.type === 'query') return x.query === url  
  })

  if (item) watchlist.splice(watchlist.indexOf(item), 1)

  fs.writeFileSync(watchFile, JSON.stringify(watchlist), 'utf-8')
}

/**
 * Update item.
 */
export const updateWatchlistItem = async (data: LinkItem | CategoryItem | QueryItem, condition: Conditions) => {
  let watchlist: Watchlist = JSON.parse(fs.readFileSync(watchFile).toString())
  /**
   * The stuff ahead doesn't make a lot of sense so I'll try my best to explain:
   */
  watchlist = watchlist.map(x => {
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
    Object.keys(condition).forEach(cond => {
      // @ts-ignore This is fine
      if (x[cond] != condition[cond]) matches = false
    })

    if (matches) {
      /**
       * This second loop replaces all of the fields in the matched object with the new data.
       */
      Object.keys(data).forEach(i => {
        // @ts-ignore This is fine
        x[i] = data[i]
      })
    }

    return x
  })

  fs.writeFileSync(watchFile, JSON.stringify(watchlist), 'utf-8')
}