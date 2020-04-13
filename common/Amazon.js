const { MessageEmbed } = require('discord.js')
const cheerio = require('cheerio')
const request = require('request-promise')

module.exports = {
  getLink: (code, suffix) => getLink(code, suffix),
  find: (q) => find(q),
  watch: (bot, channel, link) => watch(bot, channel, link)
}

/**
 * Return a full Amazon link using a product code and country suffix
 * 
 * @param {string} code 
 * @param {string} suffix 
 * 
 * @returns {string} 
 */
function getLink(code, suffix) {
  return `https://amazon${suffix}/dp/${code}`
}

/**
 * Gets top 10 Amazon items based on a search query
 * 
 * @param {string} q 
 * 
 * @returns {array}
 */
function find(q) {
  return new Promise((resolve) => {
    var sanq = q.replace(' ', '+')
    var url = `https://www.amazon.ca/s?k=${sanq}/`
    var results = []
    var options = {
      uri: url,
      transform: function(body) {
        return cheerio.load(body)
      }
    }
  
    request(options).then(($) => {
      $('.s-result-list').find('.s-result-item').each(function(){
        if(results.length >= 10) {
          resolve(results)
        } else {
          var prodLink = $(this).find('.a-link-normal[href*="/dp/"]').attr('href')
          if(prodLink) {
            var obj = {
              title: $(this).find('span.a-text-normal').text().trim(),
              ratings: $(this).find('.a-icon-alt').text().trim(),
              price: $(this).find('.a-price').find('.a-offscreen').first().text().trim(),
              sale: $(this).find('.a.text.price').find('.a-offscreen').eq(1).text().trim(),
              prod_code: prodLink.split('/dp/')[1].split('/')[0]
            }
          
            results.push(obj)
          }
        }
      })
    })
  })
}

/**
 * Takes a link and inserts it into the database for watching
 * 
 * @param {Discord.Client} bot 
 * @param {string} channel
 * @param {string} l
 * 
 * @returns {string}
 */
function watch(bot, channel, l) {
  
}