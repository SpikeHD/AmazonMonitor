import pup, { Browser } from 'puppeteer'
import useProxy from 'puppeteer-page-proxy'
import fs from 'fs'
import debug from './debug.js'
import { load } from 'cheerio'

const userAgents = [
  'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:75.0) Gecko/20100101 Firefox/75.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/535.11 (KHTML, like Gecko) Ubuntu/14.04.6 Chrome/81.0.3990.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.3538.77 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.62 Safari/537.36 Edg/81.0.416.31'
]

export async function initBrowser() {
  const config: Config = JSON.parse(fs.readFileSync('./config.json').toString())
  const browser = await pup.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    ...(config.custom_chromium_exec && { executablePath: config.custom_chromium_exec })
  })

  global.browser = browser
}

export async function getPage(url: string) {
  // IF it's a product link, append aod=1 to the URL
  if (url.includes('/dp/')) {
    if (url.includes('?')) url += '&aod=1'
    else url += '?aod=1'
  }

  debug.log(`URL: ${url}`, 'info')

  const page = await global?.browser.newPage()
  const uAgent = userAgents[Math.floor(Math.random() * userAgents.length)]
  const now = new Date().getTime()
  let proxy: string | null = null

  if (fs.existsSync('proxylist.txt')) {
    const proxies = fs.readFileSync('proxylist.txt').toString().split('\n')

    if (proxies.length > 0) {
      proxy = proxies[Math.floor(Math.random() * proxies.length)]
    }
  }

  if (proxy) {
    debug.log('Selected proxy URL: ' + proxy, 'info')
    page.setRequestInterception(true)

    page.on('request', async (req) => {
      if (!proxy?.startsWith('http')) proxy = 'https://' + proxy

      await useProxy(req, proxy).catch(e => {
        debug.log('Failed to apply proxy, request won\'t go through', 'error')
        debug.log(e, 'error')
      })
    })
  }

  await page.setUserAgent(uAgent)
  await page.goto(url, { waitUntil: 'domcontentloaded' })

  debug.log('Waiting a couple seconds for JavaScript to load...', 'info')

  await new Promise(r => setTimeout(r, 1500))

  // Just in ase there are misleading redirects, make sure we click the right "dimension-value" button
  const useImgSwatch = (await page.$$('.dimension-values-list')).length === 0 && (await page.$$('.imageSwatches')).length > 0
  const maybeDimensionValues = useImgSwatch ? await page.$$('.imageSwatches') : await page.$$('.dimension-values-list')

  debug.log('Do we have dimension values? ' + String(maybeDimensionValues.length > 0), 'debug')
  debug.log('Are they via img swatches? ' + String(useImgSwatch), 'debug')

  if (maybeDimensionValues.length > 0) {
    debug.log('Found dimension values, ensuring we are on the right one...', 'debug')

    // For each <li> in the dimension values list, we can do a really sneaky trick where we compare image URLs
    const firstSidebarImage = (await page.$eval('#altImages li.item img', (el: HTMLImageElement) => el.src)).split('/I/')[1]?.split('._')[0]
    const dimensionValue = maybeDimensionValues[0]
    const dimensionValueImages = await dimensionValue.$$('li img')

    debug.log(`First sidebar image: ${firstSidebarImage}`, 'debug')

    for (let i = 0; i < dimensionValueImages.length; i++) {
      if (!firstSidebarImage) break

      const image = dimensionValueImages[i]
      const imageSrc = (await page.evaluate((el: HTMLImageElement) => el.src, image)).split('/I/')[1]?.split('._')[0]

      debug.log(`Comparing first image ${firstSidebarImage} with button img ${imageSrc}...`)

      if (!imageSrc) continue

      if (imageSrc === firstSidebarImage) {
        debug.log(`Found matching image at index ${i}, clicking and loading...`, 'debug')
        await image.click()

        await new Promise(r => setTimeout(r, 1500))
        break
      }
    }
  }

  const html = await page.evaluate(() => document.body.innerHTML).catch(e => debug.log(e, 'error'))

  // DEBUG save to file
  fs.writeFileSync('page.html', html as string)

  // No need for page to continue to exist
  page.close()

  if (!html) {
    debug.log('Failed to load page.', 'error')
    return null
  }

  const $ = await load(html)

  debug.log(`Page took ${new Date().getTime() - now}ms to load.`, 'info')

  if (typeof $ !== 'function') {
    debug.log('Failed to load page.', 'error')
    return null
  }

  return $
}