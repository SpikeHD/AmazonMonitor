import fs from 'fs'
import { CheerioAPI } from 'cheerio'
import { getPage } from './browser.js'
import debug from './debug.js'
import { linkToAsin, parseParams, priceFormat } from './utils.js'

const config: Config = JSON.parse(fs.readFileSync('./config.json').toString())

export async function search(query: string, suffix: string) {
  const sanq = query.replace(/ /g, '+')
  const url = `https://www.amazon.${suffix}/s?k=${sanq}`
  const results: SearchData[] = []
  const foundAsins: string[] = []

  const $ = await getPage(url)
  const limit = $('.s-result-list').find('.s-result-item').length

  if (!limit || limit === 0) return results

  $('.s-result-list').find('.s-result-item').each(function () {
    if (results.length >= limit) return

    const link = '/dp/' + $(this).find('.a-link-normal[href*="/dp/"]').first().attr('href')?.split('/dp/')[1].split('?')[0]

    if (!link || link.includes('undefined')) return

    const asin = linkToAsin(link)
    const priceString = $(this).find('.a-price').find('.a-offscreen').first().text().trim()
    const price = priceFormat($(this).find('.a-price').find('.a-offscreen').first().text().trim().replace(/[a-zA-Z]/g, ''))
    const maybeCoupon = priceFormat($(this).find('.s-coupon-unclipped span').first().text().trim().replace(/[a-zA-Z]/g, ''))
    const isPct = $(this).find('.s-coupon-unclipped span').first().text().trim().includes('%')

    // prevent duplicates
    if (foundAsins.includes(asin)) return
    foundAsins.push(asin)

    results.push({
      fullTitle: $(this).find('span.a-text-normal').text().trim(),
      ratings: $(this).find('.a-icon-alt').text().trim(),
      coupon: isPct ? parseFloat(price) * (parseFloat(maybeCoupon) / 100) : maybeCoupon.includes('NaN') ? 0 : parseFloat(maybeCoupon),
      price: price.includes('NaN') ? '' : price,
      lastPrice: parseFloat(price) || 0,
      symbol: priceString.replace(/[,.]+/g, '').replace(/[\d a-zA-Z]/g, ''),
      sale: $(this).find('.a.text.price').find('.a-offscreen').eq(1).text().trim(),
      fullLink: `https://www.amazon.${suffix}/dp/${asin}`,
      image: $(this).find('.s-image').attr('src'),
      asin
    })
  })

  return results
}

export async function category(url: string) {
  let node = url.split('node=')[1]
  if (node?.includes('&')) node = node.split('&')[0]

  let ie = url.split('ie=')[1]
  if (ie?.includes('&')) ie = ie.split('&')[0]

  const tld = url.split('amazon.')[1].split('/')[0]
  const path = url.split(tld + '/')[1].split('?')[0]

  // Get parsed page with puppeteer/cheerio
  const $ = await getPage(`https://www.amazon.${tld}/${path}/?ie=${ie}&node=${node}`).catch(e => {
    debug.log(e, 'error')
  })

  if (!$) return null

  debug.log('Detected category', 'debug')

  const categoryObj: Category = {
    name: $('.bxw-pageheader__title h1').text().trim(),
    link: url,
    list: [],
    node
  }

  const topRated = $('.octopus-best-seller-card .octopus-pc-card-content li.octopus-pc-item').toArray()
  
  // @ts-expect-error
  categoryObj.list = topRated.map(() => {
    const item = $(this).find('.octopus-pc-item-link')
    const asin = item.attr('href').split('/dp/')[1].split('?')[0].replace(/\//g, '')
    const name = item.attr('title')
    const priceFull = $(this).find('.octopus-pc-asin-price').text().trim()
    const price = priceFormat(priceFull.replace(/[a-zA-Z]/g, ''))

    return {
      fullTitle: name,
      fullLink: `https://amazon.${tld}/dp/${asin}/`,
      asin: asin,
      price: price.includes('NaN') ? '' : price,
      lastPrice: parseFloat(price) || 0,
      symbol: priceFull.replace(/[,.]+/g, '').replace(/[\d a-zA-Z]/g, ''),
      image: $(this).find('.octopus-pc-item-image').attr('src'),
      node
    }
  })

  // Node set for validation
  categoryObj.node = node
  
  return categoryObj
}

export async function item(url: string) {
  // If config contains URL params, add them to the URL
  if (Object.keys(config.url_params).length > 0) {
    url += parseParams(config.url_params)
  }

  const $ = await getPage(url).catch(e => {
    debug.log(e, 'error')
  })

  if (!$) return null

  const category = $('#wayfinding-breadcrumbs_container').find('.a-list-item').find('a').text().trim().toLowerCase()
  let emptyVals = 0
  let item: ProductInfo
  
  switch (category) {
  case 'kindle store':
  case 'books':
    item = await parseBook($, url)
    break
  default:
    item = await parseItem($, url)
  }

  Object.keys(item).forEach((k: keyof ProductInfo) => {
    // @ts-ignore
    if(typeof item[k] === 'string' && item[k].length === 0) emptyVals++
  })

  if(emptyVals > 1) debug.log(`Detected ${emptyVals} empty values. Could potentially mean bot was flagged`, 'warn')

  return item
}

async function parseItem($: CheerioAPI, url: string): Promise<ProductInfo> {
  debug.log('Detected as a regular item', 'debug')
  
  let couponDiscount = 0

  // Get the coupon price, if it exists
  if ($('label[id*="couponTextpctch"]').text().trim() !== '') {
    couponDiscount = parseInt($('label[id*="couponTextpctch"]').text().trim().match(/(\d+)/)[0], 10) || 0
  }

  const priceElms = [
    $('#priceblock_ourprice').text().trim(),
    $('#priceblock_saleprice').text().trim(),
    $('#sns-base-price').text().trim(),
    String(
      parseFloat(priceFormat($('#corePriceDisplay_desktop_feature_div').find('.a-price').find('.a-offscreen').eq(0).text().trim())) - couponDiscount
    ),
    String(
      parseFloat(priceFormat($('#corePriceDisplay_desktop_feature_div').find('.a-price-whole').first().text().trim() + $('#corePriceDisplay_desktop_feature_div').find('.a-price-fraction').first().text().trim())) - couponDiscount
    ),
  ]

  const shippingElms = [
    $('#ourprice_shippingmessage').find('.a-icon-prime') ? 'Free with prime' : $('#ourprice_shippingmessage').find('.a-color-secondary').text().trim(),
    $('#saleprice_shippingmessage').find('b').text().trim()
  ]

  // Most items have feature lists
  const features = $('#feature-bullets').find('li').find('span').toArray()
  const parsedFeatures: string[] = []
  
  features.forEach(f => {
    // Get features in a more normal format
    parsedFeatures.push(` - ${$(f).text().trim()}`)
  })

  let comparePrice = ''
  const product: ProductInfo = {
    fullTitle: $('#productTitle').text().trim(),
    fullLink: url,
    asin: linkToAsin(url),
    seller: $('#bylineInfo').text().trim(),
    price: '',
    lastPrice: 0,
    symbol: '',
    shipping: '',
    rating: $('.a-icon-star').find('.a-icon-alt').first().text().trim(),
    features: parsedFeatures,
    availability: $('#availability').first().find('span').text().trim(),
    image: $('#landingImage').attr('data-old-hires') || 'https://via.placeholder.com/300x300.png?text=No+Image'
  }

  // Get other offer prices
  const aodOffers = $('#aod-offer-price').toArray()

  aodOffers.forEach(o => {
    const price = $(o).find('.a-offscreen').first().text().trim()
    if (parseFloat(priceFormat(price))) priceElms.push(price)
  })

  // Scan all price elements and get whichever actually exist
  priceElms.forEach(p => {
    const flt = parseFloat(priceFormat(p))
    const currentPrice = parseFloat(priceFormat(product.price))

    if (!currentPrice || flt < currentPrice) {
      product.price = flt.toFixed(2)
      product.lastPrice = flt
      product.symbol = p.replace(/[,.]+/g, '').replace(/[\d a-zA-Z]/g, '')
    }
  })

  if (priceElms[2].replace(/[,.]+/g, '').replace(/\d/g, '')) product.symbol = priceElms[2].replace(/[,.]+/g, '').replace(/\d/g, '')

  // Scan all shipping elements and get whichever actually exist
  const sellers = $('.pa_mbc_on_amazon_offer').toArray()

  // Scan for Amazon seller
  for (let i = 0; i < sellers.length; i++) {
    const seller = $(sellers[i])

    // This is our Amazon seller, grab this price
    const p = seller.find('.a-color-price').text().trim()
    const s = seller.find('.mbc-delivery').text().trim()

    comparePrice = !comparePrice || parseFloat(priceFormat(p)) < parseFloat(comparePrice) ? priceFormat(p) : comparePrice
    shippingElms.push(s)
  }

  // Finalization
  if (!product.symbol) product.symbol = '$'
  if (comparePrice && parseFloat(product.price) > parseFloat(comparePrice)) product.price = comparePrice

  // Finalize the price
  product.price = priceFormat(product.price)

  debug.log('Full object', 'debug')
  debug.log(product, 'debug')

  return product
}

async function parseBook($: CheerioAPI, url: string): Promise<ProductInfo> {
  debug.log('Detected as a book item', 'debug')

  // Gets buying options
  const buyingOptions = $('#tmmSwatches').find('ul').find('li').toArray()
  const mainPrice = priceFormat($('#buybox').find('a-color-price').first().text().trim().replace(/,/g, ''))
  const optionsArray: string[] = []

  buyingOptions.forEach(o => {
    const type = $(o).find('.a-button-inner').find('span').first().text().trim()
    const price = priceFormat($(o).find('.a-button-inner').find('span').eq(1).text().trim())
    
    if(price.length > 1 && !type.toLowerCase().includes('audiobook')) optionsArray.push(` - ${type}: ${price}`)
  })

  const book: ProductInfo = {
    fullTitle: $('#productTitle').text().trim(),
    fullLink: url,
    asin: linkToAsin(url),
    seller: $('#bylineInfo').find('.contributorNameID').text().trim(),
    price: mainPrice,
    symbol: mainPrice.replace(/[,.]+/g, '').replace(/[\d a-zA-Z]/g, ''),
    lastPrice: parseFloat(mainPrice),
    shipping: 'N/A',
    rating: $('.a-icon-star').find('.a-icon-alt').first().text().trim(),
    features: optionsArray,
    availability: $('#buybox').find('.a-text-center').find('a').first().text().trim(),
    image: $('#imgBlkFront').attr('src') || 'https://via.placeholder.com/300x300.png?text=No+Image'
  }

  return book
}