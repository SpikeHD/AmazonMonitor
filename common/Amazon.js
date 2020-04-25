const { MessageEmbed } = require('discord.js')
const util = require('./util')

module.exports = {
  getLink: (code, suffix) => getLink(code, suffix),
  find: (q, suffix) => find(q, suffix),
  details: (bot, l) => details(bot, l),
  watch: (bot, channel, link) => watch(bot, channel, link)
}

/**
 * Gets top 10 Amazon items based on a search query
 * 
 * @param {string} q 
 * 
 * @returns {array}
 */
function find(q, suffix) {
  return new Promise((resolve, reject) => {
    var sanq = q.replace(' ', '+')
    var url = `https://www.amazon.ca/s?k=${sanq}/`
    var results = []

    util.getPage(url).then($ => {
      var lim = $('.s-result-list').find('.s-result-item').length
      $('.s-result-list').find('.s-result-item').each(function () {
        if (results.length >= 10 || results.length >= lim) {
          resolve(results)
        } else {
          var prodLink = $(this).find('.a-link-normal[href*="/dp/"]').attr('href')
          if (prodLink) {
            var obj = {
              title: $(this).find('span.a-text-normal').text().trim(),
              ratings: $(this).find('.a-icon-alt').text().trim(),
              price: $(this).find('.a-price').find('.a-offscreen').first().text().trim(),
              sale: $(this).find('.a.text.price').find('.a-offscreen').eq(1).text().trim(),
              prod_link: `https://www.amazon${suffix}${prodLink}`
            }

            results.push(obj)
          }
        }
      })
    })
  })
}

/**
 * Takes a product link or code and spits out some useful details
 * 
 * @param {string} l 
 */
function details(bot, l) {
  return new Promise((resolve, reject) => {
    if(!l.startsWith('https://www.amazon')) return new Error('Not a valid link')
  
    util.getPage(l).then(($) => {
      var features = $('#feature-bullets').find('li').find('span').toArray()
      var parsedFeatures = []
      features.forEach(f => {
        parsedFeatures.push(` - ${$(f).text().trim()}`)
      });

      var obj = {
        full_title: $('#productTitle').text().trim(),
        full_link: l,
        seller: $('#bylineInfo').text().trim(),
        price: $('#priceblock_ourprice').text().trim(),
        shipping: $('#ourprice_shippingmessage').find('.a-icon-prime') ? 'Free with prime' : $('#ourprice_shippingmessage').find('.a-color-secondary').text().trim(),
        rating: $('.a-icon-star').find('.a-icon-alt').first().text().trim(),
        features: parsedFeatures,
        availability: $('#availability').first().find('span').text().trim(),
        image: $('#landingImage').attr('data-old-hires')
      }

      resolve(obj)
    }).catch(e => reject(e))
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