const { MessageEmbed } = require('discord.js')
const debug = require('./debug')
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
 * @param {String} q 
 * 
 * @returns {Array}
 */
function find(bot, q, suffix) {
  return new Promise((resolve, reject) => {
    var sanq = q.replace(' ', '+')
    var url = `https://www.amazon${suffix}/s?k=${sanq}/`
    var results = []

    // Get parsed page with puppeteer/cheerio
    bot.util.getPage(url, {type: bot.proxylist ? 'proxy':'headless'}).then($ => {
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
    }).catch(e => debug.log(e, 'error'))
  })
}

/**
 * Takes a product link or code and spits out some useful details
 * 
 * @param {String} l 
 */
function details(bot, l) {
  return new Promise((resolve, reject) => {
    var asin;
  
    // Try to see if there is a valid asin
    try {
      asin = l.split("/dp/")[1].split("/")[0]
    } catch(e) {
      debug.log(e, 'warn')
      reject('Not a valid link')
    }

    l += bot.util.parseParams(bot.URLParams)
  
    // Get parsed page with puppeteer/cheerio
    bot.util.getPage(`https://www.amazon.com/dp/${asin.replace(/[^A-Za-z0-9]+/g, '')}/`, {type: bot.proxylist ? 'proxy':'headless'}).then(($) => {
      resolve(parse($, l))
    }).catch(e => {
      debug.log(e, 'error')
      reject(e)
    })
  })
}

function parse($, l) {
  var category = $('#wayfinding-breadcrumbs_container').find('.a-list-item').find('a').text().trim().toLowerCase()
  var emptyVals = 0
  var obj;

  debug.log('Type: ' + category, 'info')

  switch (category) {
    default: obj = getRegularItem($, l)
    break;
    case "kindle store":
    case "books": obj = getBookItem($, l)
    break;
  }

  Object.keys(obj).forEach(k => {
    if(obj[k].length === 0) emptyVals++
  })

  if(emptyVals > 1) debug.log(`Detected ${emptyVals} empty values. Could potentially mean bot was flagged`, 'warn')

  return obj
}

/**
 * Gets the details of a regular, normally formatted Amazon item
 * 
 * @param {Object} $ 
 * @param {String} l 
 */
function getRegularItem($, l) {
  debug.log('Detected as a regular item', 'debug')
  var priceElms = [
    $('#priceblock_ourprice').text().trim(),
    $('#priceblock_saleprice').text().trim()
  ]
  var shippingElms = [
    $('#ourprice_shippingmessage').find('.a-icon-prime') ? 'Free with prime' : $('#ourprice_shippingmessage').find('.a-color-secondary').text().trim(),
    $('#saleprice_shippingmessage').find('b').text().trim()
  ]
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
    asin: l.split("/dp/")[1].split("/")[0],
    seller: $('#bylineInfo').text().trim(),
    price: '',
    shipping: '',
    rating: $('.a-icon-star').find('.a-icon-alt').first().text().trim(),
    features: parsedFeatures,
    availability: $('#availability').first().find('span').text().trim(),
    image: $('#landingImage').attr('data-old-hires') || 'https://via.placeholder.com/300x300.png?text=No+Image'
  }

  priceElms.forEach(p => {
    if(p.length > 0) obj.price = p.replace(/,/g, '')
  })
  shippingElms.forEach(s => {
    if(s.length > 0) obj.shipping = s
  })

  debug.log('Full object: ', 'debug')
  debug.log(obj, 'debug')

  return obj
}

/**
 * Gets details of a Amazon book item
 * 
 * @param {Object} $ 
 * @param {String} l 
 */
function getBookItem($, l) {
  debug.log('Detected as a book item', 'debug')
  // Gets buying options
  var buyingOptions = $('#tmmSwatches').find('ul').find('li').toArray()
  var mainPrice = $('#buybox').find('a-color-price').first().text().trim().replace(/,/g, '')
  var optionsArray = []

  buyingOptions.forEach(o => {
    var type = $(o).find('.a-button-inner').find('span').first().text().trim()
    var price = $(o).find('.a-button-inner').find('span').eq(1).text().trim()
    
    if(price.length > 1 && !type.toLowerCase().includes('audiobook')) optionsArray.push(` - ${type}: ${price}`)
  })

  var obj = {
    full_title: $('#productTitle').text().trim(),
    full_link: l,
    asin: l.split("/dp/")[1].split("/")[0],
    seller: $('#bylineInfo').find('.contributorNameID').text().trim(),
    price: mainPrice,
    shipping: 'N/A',
    rating: $('.a-icon-star').find('.a-icon-alt').first().text().trim(),
    features: optionsArray,
    availability: $('#buybox').find('.a-text-center').find('a').first().text().trim(),
    image: $('#imgBlkFront').attr('src') || 'https://via.placeholder.com/300x300.png?text=No+Image'
  }

  return obj
}
