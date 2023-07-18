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
  comparePrice: string;
}

