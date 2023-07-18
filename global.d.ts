declare module NodeJS {
  interface Global {
    browser: import('puppeteer').Browser
  }
}

interface Config {
  prefix: string
  token: string
  minutes_per_check: number
  search_reponse_ms: number
  url_params: {
    [key:string]: string
  }
  guild_item_limit: number
  cache_limit: number
  required_perms: import('discord.js').PermissionResolvable[]
  tld: string
  auto_cart_link: boolean
  debug_enabled: boolean
}

interface Command {
  name: string
  description: string
  usage: string
  type: string
  run: (guild: import('discord.js').Guild, message: import('discord.js').Message, args: string[]) => Promise<void>
}

interface PartialWatchlistItem {
  guild_id: string
  channel_id: string
  priceLimit: number
  type: 'link' | 'category' | 'query'
}

interface LinkItem extends PartialWatchlistItem {
  link: string
  lastPrice: number
  item_name: string
}

interface CategoryItem extends PartialWatchlistItem {
  name: string
  link: string
  cache: CategoryData[]
}

interface QueryItem extends PartialWatchlistItem {
  query: string
  cache: SearchData[]
}

type Watchlist = Array<LinkItem | CategoryItem | QueryItem>

interface SearchData {
  full_title: string;
  ratings: string;
  price: string;
  lastPrice: number;
  symbol: string;
  sale: string;
  asin: string;
  full_link: string;
}

interface Category {
  name: string;
  link: string;
  list: CategoryData[];
  node: string;
}

interface CategoryData {
  full_title: string;
  full_link: string;
  asin: string;
  price: string;
  lastPrice: number;
  symbol: string;
  image: string;
  node: null;
}

interface PartialProductInfo {
  full_title: string;
  full_link: string;
  asin: string;
  price: string;
  lastPrice: number;
  symbol: string;
  image: string;
}

interface ProductInfo extends PartialProductInfo {
  seller: string;
  shipping: string;
  rating: string;
  features: string[];
  availability: string;
}
