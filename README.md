![](https://img.shields.io/github/package-json/v/SpikeHD/AmazonMonitor) ![](https://img.shields.io/david/SpikeHD/AmazonMonitor) ![](https://img.shields.io/github/workflow/status/SpikeHD/AmazonMonitor/ESLint)
# Description

AmazonMonitor is a self-hosted Discord bot designed for notifying you, or other people, about price drops and restocks on Amazon. It supports setting price limits, watching items from other countries, watching entire search queries and categories, and more.

[FAQ (please read this before creating an issue. Thanks!)](https://github.com/SpikeHD/AmazonMonitor/blob/master/FAQ.md)

# Jump to:

* [Requirements](#requirements)
* [Configuration](#configuration)
  * [prefix](#prefix)
  * [token](#token)
  * [url_params](#url_params)
  * [guild_item_limit](#guild_item_limit)
  * [cache_limit](#cache_limit)
  * [required_perms](#required_perms)
  * [tld](#tld)
  * [auto_cart_link](#auto_cart_link)
  * [debug_enabled](#debug_enabled)
* [Using a proxy list](#proxies)
* [Starting the bot](#starting)
* [Commands](#commands)
  * [help](#help)
  * [search](#search)
  * [details](#details)
  * [watch](#watch)
  * [watchlist](#watchlist)
  * [unwatch](#unwatch)
* [Contributing](#contributing)


# Requirements

- [NodeJS v12.2 or above](https://nodejs.org/en/)

# Configuration

The project comes with an example configuration you can use as a base. To begin configuring the bot:

1. Copy the `config.example.json` file.
2. Rename it to `config.json`.
3. Begin editing in your favorite text editor.

It may be hard to know exactly what each option does, and what you can set them to, so they are all outlined below.

## prefix

This is the character, or characters, that you will begin every command with. Good examples are `$` or `!`.

## token

The token is the login information of the bot. If you don't know how to set up a bot user, refer to [this guide](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot).

## url_params

If you want to include a referral code or something, you can use this option to add as many as you want. You'll notice the curly braces; inside of those is where you add each parameter. An example would be something like this:

```json
"url_params":{
  "ref":"my_ref_code",
  "tag":"my_tag"
  etc...
 }
```

which would produce a link that looks like this:

```https://www.amazon.com/dp/B08L5R1CCC/?ref=my_ref_code&tag=my_tag```

## guild_item_limit

The guild item limit is used to control how many items the bot can keep track of at a time. It's hard to judge what a reasonable number is, so just keep it as low as you can.

## cache_limit

A newer addition, the cache limit is the amount of items that will be watched in a category or search query.

## required_perms

These are individual permissions, not roles, that a user must have in order to run any of the commands. You can find a reference [here.](https://discord.js.org/#/docs/main/stable/class/Permissions?scrollTo=s-FLAGS)

## tld

A TLD, or *Top-Level Domain*, is the little `.com` or `.ca` of a URL. Each regional Amazon site is given a different TLD, so you can set this to your favorite country's TLD and it will grab Amazon results and data from that site. Some examples are:

* `ca` - Canada
* `co.uk` - UK
* `jp` - Japan

\* Just as a heads up, if you run the `details` or `watch` command on an item listed in a different country, it will not convert it to the correct country.

## auto_cart_link

If you're the efficient type, setting this to `true` will make sure that the links in stock/price notifications will bring you to a page that will automatically add the item to your cart.

## debug_enabled

If set to `true`, the console window will spit out all kinds of information related to what it's doing, in order to give you a better understanding of what's going on in case you're having trouble.

# Proxies

To make use of your fancy-dancey proxylist, you simply need to create a file named `proxylist.txt` in the main bot folder. Each ip/url should be separated by a new line. Each one should be formatted like so: `http://username:password@ip:port`. An example of some are listed below in the same format yours should be listed:

```
http://myuser:password123@127.0.0.1:12345
http://spikehd:testpass@111.22.33.456:8008
http://amazonuser:amazonpassword@26.29.66.123:2318008
etc...
```

# Starting

To start the bot, simply open a terminal and run these commands:

* Set directory to bot directory:
  ```sh
  cd "C:/Path/To/Bot/Folder"
  ```
* Run the main file:
  ```sh
  node index
  ```
  
To restart the bot after a config change:

* Press Ctrl+C
* Start it the same as before:
  ```sh
  node index
  ```
 
# Commands

Like explained before, commands can only be run with users that have the permissions in the `required_perms` section of the config.

## help

* Format: `help`
* Example: `!help`

This will give you some details on each command.

## search

* Format: `search [query]`
* Example: `!search nintendo+switch`

Allows you to search for items matching a query, just like on the website. Additional actions are available once the list of items is returned, but you can refer to the information there.

## details

* Format: `details [Amazon link]`
* Example: `!details https://www.amazon.com/Beats-Studio3-Wireless-Headphones-Collection/dp/B07HYD4VCW/`

Spits out details on an item from Amazon. Useful in conjunction with `search`.

## watch

* Format: `watch -l [Amazon link]` OR `watch -c [Amazon category]` OR `watch -q [search query]`. Include `-p` for a price limit, eg. `watch -q toothbrush -p 100`.
* Examples:
  * `!watch -l https://www.amazon.it/dp/B08C76W2WM/`
  * `!watch -c https://www.amazon.ca/b/?_encoding=UTF8&node=677244011`
  * `!watch -q iphone+12`

Adds an item, category, or search query to the watchlist.

## watchlist

* Format: `watchlist`
* Example: `!watchlist`

View your watchlist as a numbered list. Useful for `unwatch`.

## unwatch

* Format: `unwatch [item position in watchlist]`
* Example: `!unwatch 2`

Remove an item from your watchlist.

# Contributing

Wanna add stuff? Sweet! Issues, PRs, etc. are all welcome!
