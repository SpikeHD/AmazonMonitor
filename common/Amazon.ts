import * as debug from './debug.js'
import * as util from './util.js'

/**
 * Gets top 10 Amazon items based on a search query
 * 
 * @param {String} q 
 * 
 * @returns {Array}
 */
export const find = async (cfg, q, suffix = 'com') => {
  const sanq = q.replace(' ', '+')
  const url = `https://www.amazon.${suffix}/s?k=${sanq}/`
  let results = []

  // Get parsed page with puppeteer/cheerio
  let $ = await cfg.util.getPage(url, {
    type: cfg.proxylist ? 'proxy' : 'headless'
  }).catch(e => debug.log(e, 'error'))
  let lim = $('.s-result-list').find('.s-result-item').length

  if (!lim || lim === 0) return null

  $('.s-result-list').find('.s-result-item').each(function () {
    if (results.length >= lim) {
      return
    } else {
      let prodLink = $(this).find('.a-link-normal[href*="/dp/"]').attr('href')

      // The way it gets links isn't perfect, so we just make sure the link is valid (or else this crashes and burns)
      if (prodLink) {
        let asin = prodLink.split('/dp/')[1].split('/')[0].replace(/\?/g, '')
        let priceString = $(this).find('.a-price').find('.a-offscreen').first().text().trim()
        let price = util.priceFormat($(this).find('.a-price').find('.a-offscreen').first().text().trim().replace(/[a-zA-Z]/g, ''))
        let obj = {
          full_title: $(this).find('span.a-text-normal').text().trim(),
          ratings: $(this).find('.a-icon-alt').text().trim(),
          price: price.includes('NaN') ? '':price,
          lastPrice: parseFloat(price) || 0,
          symbol: priceString.replace(/[,.]+/g, '').replace(/[\d a-zA-Z]/g, ''),
          sale: $(this).find('.a.text.price').find('.a-offscreen').eq(1).text().trim(),
          asin: asin,
          full_link: `https://www.amazon.${suffix}/dp/${asin}`
        }

        results.push(obj)
      }
    }
  })

  return results || []
}

export const categoryDetails = async (cfg, l) => {
  let node, ie, tld, path

  try {
    node = l.split('node=')[1]
    if (node?.includes('&')) node = node.split('&')[0]
    ie = l.split('ie=')[1]
    if (ie?.includes('&')) ie = ie.split('&')[0]
    tld = l.split('amazon.')[1].split('/')[0]
    path = l.split(tld + '/')[1].split('?')[0]
  } catch (e) {
    debug.log(e, 'warn')
    return null
  }

  // Get parsed page with puppeteer/cheerio
  const page = await cfg.util.getPage(`https://www.amazon.${tld}/${path}/?ie=${ie}&node=${node}`, {
    type: cfg.proxylist ? 'proxy' : 'headless'
  }).catch(e => {
    debug.log(e, 'error')
    return
  })

  let obj = category(page, l)
  // Node set for validation
  obj.node = node
  
  return obj
}

/**
 * Takes a product link or code and spits out some useful details
 * 
 * @param {String} l 
 */
export const details = async (cfg, l) => {
  let asin, tld

  // Try to see if there is a valid asin
  try {
    asin = l.split('/dp/')[1].split('/')[0]
    tld = l.split('amazon.')[1].split('/')[0]
  } catch (e) {
    debug.log(e, 'warn')
    return
  }

  l += cfg.util.parseParams(cfg.url_params)

  // Get parsed page with puppeteer/cheerio
  const page = await cfg.util.getPage(`https://www.amazon.${tld}/dp/${asin.replace(/[^A-Za-z0-9]+/g, '')}/`, {
    type: cfg.proxylist ? 'proxy' : 'headless'
  }).catch(e => {
    debug.log(e, 'error')
    return
  })

  return parse(page, l)
}

function parse($, l) {
  if (!$) return null

  let category = $('#wayfinding-breadcrumbs_container').find('.a-list-item').find('a').text().trim().toLowerCase()
  let emptyVals = 0
  let obj

  debug.log('Type: ' + category, 'info')

  switch (category) {
  default: obj = getRegularItem($, l)
    break
  case 'kindle store':
  case 'books': obj = getBookItem($, l)
    break
  }

  Object.keys(obj).forEach(k => {
    if(obj[k].length === 0) emptyVals++
  })

  if(emptyVals > 1) debug.log(`Detected ${emptyVals} empty values. Could potentially mean bot was flagged`, 'warn')

  return obj
}

/**
 * Get contents of category and return prices and names.
 * 
 * @param {Object} $ 
 * @param {String} l 
 */
function category($, l) {
  debug.log('Detected category', 'debug')
  let tld = l.split('amazon.')[1].split('/')[0]
  let obj = {
    name: null,
    link: l,
    list: [],
    node: null
  }
  let topRated = $('.octopus-best-seller-card .octopus-pc-card-content li.octopus-pc-item').toArray()
  
  obj.list = topRated.map(i => {
    let item = $(i).find('.octopus-pc-item-link')
    let asin = item.attr('href').split('/dp/')[1].split('?')[0].replace(/\//g, '')
    let name = item.attr('title')
    let priceFull = $(i).find('.octopus-pc-asin-price').text().trim()
    let price = util.priceFormat(priceFull.replace(/[a-zA-Z]/g, ''))

    return {
      full_title: name,
      full_link: `https://amazon.${tld}/dp/${asin}/`,
      asin: asin,
      price: price.includes('NaN') ? '':price,
      lastPrice: parseFloat(price) || 0,
      symbol: priceFull.replace(/[,.]+/g, '').replace(/[\d a-zA-Z]/g, ''),
      image: $(i).find('.octopus-pc-item-image').attr('src'),
      node: null
    }
  })

  obj.name = $('.bxw-pageheader__title h1').text().trim()

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

  let couponDiscount = 0
  
  // Get the coupon price, if it exists
  if ($('label[id*="couponTextpctch"]').text().trim() !== '') {
    couponDiscount = parseInt($('label[id*="couponTextpctch"]').text().trim().match(/(\d+)/)[0], 10) || 0
  }

  let priceElms = [
    $('#priceblock_ourprice').text().trim(),
    $('#priceblock_saleprice').text().trim(),
    $('#sns-base-price').text().trim(),
    String(
      parseFloat(util.priceFormat($('.a-price').find('.a-offscreen').eq(0).text().trim())) - couponDiscount
    ),
    String(
      parseFloat(util.priceFormat($('.a-price-whole').first().text().trim() + $('.a-price-fraction').first().text().trim())) - couponDiscount
    ),
  ]
  let shippingElms = [
    $('#ourprice_shippingmessage').find('.a-icon-prime') ? 'Free with prime' : $('#ourprice_shippingmessage').find('.a-color-secondary').text().trim(),
    $('#saleprice_shippingmessage').find('b').text().trim()
  ]

  // Most items have feature lists
  let features = $('#feature-bullets').find('li').find('span').toArray()
  let parsedFeatures = []

  features.forEach(f => {
    // Get features in a more normal format
    parsedFeatures.push(` - ${$(f).text().trim()}`)
  })

  let obj = {
    full_title: $('#productTitle').text().trim(),
    full_link: l,
    asin: l.split('/dp/')[1].split('/')[0],
    seller: $('#bylineInfo').text().trim(),
    price: '',
    symbol: '',
    shipping: '',
    rating: $('.a-icon-star').find('.a-icon-alt').first().text().trim(),
    features: parsedFeatures,
    availability: $('#availability').first().find('span').text().trim(),
    image: $('#landingImage').attr('data-old-hires') || 'https://via.placeholder.com/300x300.png?text=No+Image',
    comparePrice: '',
  }

  // Get other offer prices
  const aodOffers = $('#aod-offer').toArray()

  aodOffers.forEach(o => {
    const price = $(o).find('.a-offscreen').text().trim()
    if (parseFloat(util.priceFormat(price))) priceElms.push(price)
  })

  priceElms.forEach(p => {
    const flt = parseFloat(util.priceFormat(p))
    const cur = parseFloat(obj.price)

    if (isNaN(cur) || cur === 0 || flt && flt < parseFloat(obj.price)) {
      obj.price = util.priceFormat(p)
      // Hacky but effective way to get currency symbol
      obj.symbol = p.replace(/[,.]+/g, '').replace(/\d/g, '') || $('.a-price-symbol').first().text().trim()
    }
  })

  obj.symbol = priceElms[2].replace(/[,.]+/g, '').replace(/\d/g, '')

  const sellers = $('.pa_mbc_on_amazon_offer').toArray()

  // Scan for Amazon seller
  for (let i = 0; i < sellers.length; i++) {
    const seller = $(sellers[i])

    // This is our Amazon seller, grab this price
    const p = seller.find('.a-color-price').text().trim()
    const s = seller.find('.mbc-delivery').text().trim()

    obj.comparePrice = !obj.comparePrice || parseFloat(util.priceFormat(p)) < parseFloat(obj.comparePrice) ? util.priceFormat(p) : obj.comparePrice
    shippingElms.push(s)
  }

  // Finalization
  if (!obj.symbol) obj.symbol = '$'
  if (obj.comparePrice && parseFloat(obj.price) > parseFloat(obj.comparePrice)) obj.price = obj.comparePrice

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
  let buyingOptions = $('#tmmSwatches').find('ul').find('li').toArray()
  let mainPrice = util.priceFormat($('#buybox').find('a-color-price').first().text().trim().replace(/,/g, ''))
  let optionsArray = []

  buyingOptions.forEach(o => {
    let type = $(o).find('.a-button-inner').find('span').first().text().trim()
    let price = util.priceFormat($(o).find('.a-button-inner').find('span').eq(1).text().trim())
    
    if(price.length > 1 && !type.toLowerCase().includes('audiobook')) optionsArray.push(` - ${type}: ${price}`)
  })

  let obj = {
    full_title: $('#productTitle').text().trim(),
    full_link: l,
    asin: l.split('/dp/')[1].split('/')[0],
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
