const { MessageEmbed } = require('discord.js')
const fs = require('fs')

module.exports = {
  getLink: (code, suffix) => getLink(code, suffix),
  find: (bot, q, suffix) => find(bot, q, suffix),
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
function find(bot, q, suffix) {
  return new Promise((resolve, reject) => {
    var sanq = q.replace(' ', '+')
    var url = `https://www.amazon${suffix}/s?k=${sanq}/`
    var results = []

    // Get parsed page with puppeteer/cheerio
    bot.util.getPage(url).then($ => {

      var lim = $('.s-result-list').find('.s-result-item').length
      if(!lim || lim === 0) reject('No Results')

      $('.s-result-list').find('.s-result-item').each(function () {
        if (results.length >= 10 || results.length >= lim) {
          // We're done!
          resolve(results)
        } else {
          var prodLink = $(this).find('.a-link-normal[href*="/dp/"]').attr('href')
          
          // The way it gets links isn't perfect, so we just make sure the link is valid (or else this crashes and burns)
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
    var asin;
  
    // Try to see if there is a valid asin
    try {
      asin = l.split("/dp/")[1].split("/")[0]
    } catch(e) {
      reject('Not a valid link')
    }
  
    // Get parsed page with puppeteer/cheerio
    bot.util.getPage(`https://www.amazon.com/dp/${asin.replace(/[^A-Za-z0-9]+/g, '')}/`).then(($) => {
      // Most items have feature lists
      var features = $('#feature-bullets').find('li').find('span').toArray()
      var parsedFeatures = []
      features.forEach(f => {
        // Get features in a more normal format
        parsedFeatures.push(` - ${$(f).text().trim()}`)
      });

      fs.writeFileSync('test.html', $.html())

      // Big ol' object full o' stuff
      var obj = {
        full_title: $('#productTitle').text().trim(),
        full_link: l,
        seller: $('#bylineInfo').text().trim(),
        price: $('#priceblock_ourprice').text().trim(),
        shipping: $('#ourprice_shippingmessage').find('.a-icon-prime') ? 'Free with prime' : $('#ourprice_shippingmessage').find('.a-color-secondary').text().trim(),
        rating: $('.a-icon-star').find('.a-icon-alt').first().text().trim(),
        features: parsedFeatures,
        availability: $('#availability').first().find('span').text().trim(),
        image: $('#landingImage').attr('data-old-hires') || 'https://via.placeholder.com/300x300.png?text=No+Image'
      }

      resolve(obj)
    }).catch(e => reject(e))
  })
}
