const { MessageEmbed } = require('discord.js')
const cheerio = require('cheerio')
const request = require('request-promise')

module.exports = {
  find: (q) => find(q),
  watch: (bot, channel, link) => watch(bot, channel, link)
}

/**
 * Gets top 10 Amazon items based on a search query
 * 
 * @param {string} q 
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
          var prodLink = $(this).find('.a-link-normal').attr('href')
          if(!prodLink.startsWith('/gp/')) {
            results.push({
              title: $(this).find('.a-size-medium.a-text-normal').text().trim(),
              ratings: $(this).find('.a-icon-alt').text().trim(),
              price: $(this).find('.a-price').find('.a-offscreen').text().trim(),
              prod_code: prodLink.split('/dp/')[1].split('/')[0]
            })
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
 */
function watch(bot, channel, l) {
  
}