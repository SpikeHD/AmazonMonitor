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
      resolve(parse($, l))
    }).catch(e => reject(e))
  })
}

function parse($, l) {
  var category = $('#wayfinding-breadcrumbs_container').find('.a-list-item').find('a').text().trim().toLowerCase()
  var obj;

  switch (category) {
    default: obj = getRegularItem($, l)
    case "books": obj = getBookItem($, l)
  }

  return obj
}

function getRegularItem($, l) {
  // Most items have feature lists
  var features = $('#feature-bullets').find('li').find('span').toArray()
  var parsedFeatures = []
  features.forEach(f => {
    // Get features in a more normal format
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
    image: $('#landingImage').attr('data-old-hires') || 'https://via.placeholder.com/300x300.png?text=No+Image'
  }

  return obj
}

function getBookItem($, l) {
  // Gets buying options
  var buyingOptions = $('#tmmSwatches').find('ul').find('li').toArray()
  var mainPrice = $('#buybox').find('a-color-price').first().text().trim()
  var optionsArray = []

  buyingOptions.forEach(o => {
    var type = $(o).find('.a-button-inner').find('span').first().text().trim()
    var price = $(o).find('.a-button-inner').find('span').eq(1).text().trim()
    
    if(price.length > 1 && !type.toLowerCase().includes('audiobook')) optionsArray.push(` - ${type}: ${price}`)
  })

  var obj = {
    full_title: $('#productTitle').text().trim(),
    full_link: l,
    seller: $('#bylineInfo').find('.contributorNameID').text().trim(),
    price: mainPrice,
    shipping: $('#ourprice_shippingmessage').find('.a-icon-prime') ? 'Free with prime' : $('#ourprice_shippingmessage').find('.a-color-secondary').text().trim(),
    rating: $('.a-icon-star').find('.a-icon-alt').first().text().trim(),
    features: optionsArray,
    availability: $('#buybox').find('.a-text-center').find('a').first().text().trim(),
    image: $('#imgBlkFront').attr('src') || 'https://via.placeholder.com/300x300.png?text=No+Image'
  }

  console.log(obj)

  return obj
}
