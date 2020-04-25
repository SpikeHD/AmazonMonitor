const pup = require('puppeteer')
const cheerio = require('cheerio')
var browser

module.exports = {
  startPup: () => startPup(),
  getPage: (url) => getPage(url)
}

/**
 * Start a puppeteer instance
 */
async function startPup() {
  browser = await pup.launch()
  console.log("Puppeteer launched")
}

/**
 * Get page HTML
 */
function getPage(url) {
  return new Promise(res => {
    browser.newPage().then(page => {
      page.goto(url).then(() => {
        page.evaluate(() => document.body.innerHTML).then(html => {
          page.close()
          res(load(html))
        })
      })
    })
  })
}


/**
 * Load HTML with cheerio
 */
function load(html) {
  return new Promise(res => res(cheerio.load(html)))
}