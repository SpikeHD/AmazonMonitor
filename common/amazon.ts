import { getPage } from './browser.js'
import debug from './debug.js'
import { linkToAsin, priceFormat } from './utils.js'

const config: Config = JSON.parse(fs.readFileSync('./config.json').toString())

export async function search(query: string, suffix: string) {
  const sanq = query.replace(/ /g, '+')
  const url = `https://www.amazon.${suffix}/s?k=${sanq}`
  const results: SearchData[] = []

  let $ = await getPage(url)
  let limit = $('.s-result-list').find('.s-result-item').length

  if (!limit || limit === 0) return results

  $('.s-result-list').find('.s-result-item').each(function (i: number, elem: Element) {
    if (results.length >= limit) return

    let link = $(elem).find('.a-link-normal[href*="/dp/"]').attr('href')
    let asin = linkToAsin(link)

    if (!link) return

    let priceString = $(this).find('.a-price').find('.a-offscreen').first().text().trim()
    let price = priceFormat($(this).find('.a-price').find('.a-offscreen').first().text().trim().replace(/[a-zA-Z]/g, ''))

    results.push({
      full_title: $(this).find('span.a-text-normal').text().trim(),
      ratings: $(this).find('.a-icon-alt').text().trim(),
      price: price.includes('NaN') ? '' : price,
      lastPrice: parseFloat(price) || 0,
      symbol: priceString.replace(/[,.]+/g, '').replace(/[\d a-zA-Z]/g, ''),
      sale: $(this).find('.a.text.price').find('.a-offscreen').eq(1).text().trim(),
      full_link: `https://www.amazon.${suffix}/dp/${asin}`,
      asin
    })
  })

  return results
}

export async function category(url: string) {
  let node: string,
    ie: string,
    tld: string,
    path: string

  try {
    node = url.split('node=')[1]
    if (node?.includes('&')) node = node.split('&')[0]
    ie = url.split('ie=')[1]
    if (ie?.includes('&')) ie = ie.split('&')[0]
    tld = url.split('amazon.')[1].split('/')[0]
    path = url.split(tld + '/')[1].split('?')[0]
  } catch (e) {
    debug.log(e, 'warn')
    return null
  }

  // Get parsed page with puppeteer/cheerio
  const $ = await getPage(`https://www.amazon.${tld}/${path}/?ie=${ie}&node=${node}`).catch(e => {
    debug.log(e, 'error')
  })

  if (!$) return null

  debug.log('Detected category', 'debug')

  let categoryObj: Category = {
    name: $('.bxw-pageheader__title h1').text().trim(),
    link: url,
    list: [],
    node
  }

  let topRated = $('.octopus-best-seller-card .octopus-pc-card-content li.octopus-pc-item').toArray()
  
  const topRatedMap = topRated.map((i: number) => {
    let item = $(i).find('.octopus-pc-item-link')
    let asin = item.attr('href').split('/dp/')[1].split('?')[0].replace(/\//g, '')
    let name = item.attr('title')
    let priceFull = $(i).find('.octopus-pc-asin-price').text().trim()
    let price = priceFormat(priceFull.replace(/[a-zA-Z]/g, ''))

    return {
      full_title: name,
      full_link: `https://amazon.${tld}/dp/${asin}/`,
      asin: asin,
      price: price.includes('NaN') ? '' : price,
      lastPrice: parseFloat(price) || 0,
      symbol: priceFull.replace(/[,.]+/g, '').replace(/[\d a-zA-Z]/g, ''),
      image: $(i).find('.octopus-pc-item-image').attr('src'),
      node
    }
  })

  // Node set for validation
  categoryObj.node = node
  
  return categoryObj
}

export async function item(url: string) {
  let asin = linkToAsin(url)
  let tld = url.split('amazon.')[1].split('/')[0]

  // If config contains URL params, add them to the URL
}