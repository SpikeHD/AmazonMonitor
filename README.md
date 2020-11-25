# AmazonMonitor
A Discord bot that monitors Amazon items, and notifies you on price drops/restocks

## Important!
Before updating you should always check here in case of any database/config changes you may need to set.

## Before you start
"Why isn't this public?" you may ask. Well, the simple answer is that Amazon doesn't really like bots. When a program like this sends a ton of requests to Amazon all at once, they tend to catch on and start asking for human verification. Having 5 watched items per server, in even just 10 servers, is **50 requests every 2 minutes** (not accounting for the 6-second buffer per request that is used to deter said verification). This *also* means that this can break at basically any moment, so if it all of a sudden stops working without any code changes, *please* don't make an issue for it, just maybe give the bot a rest and lower your watchlist.

## Requirements
* [NodeJS v12.2 or higher](https://nodejs.org/en/)

## Setup
Setup is easy enough. Clone the repo somewhere and create a file in the main folder (the one with `index.js` in it) named `config.json`. Fill in the contents of `config.json` using this:

```json
{
  "prefix":"YOUR_PREFIX",
  "token":"YOUR_BOT_TOKEN",
  "URLParams":{},
  "guild_item_limit":5,
  "cache_limit":10,
  "required_perms":[],
  "tld":"com",
  "autoCartLink":true,
  "debugEnabled":false
}
```
Filling in the proper values of course. We'll go over each of them specifically below.

# New in v1.5.0 - Cache limit and watch types
Amazon categories (eg. `https://www.amazon.ca/Tablets/b/?ie=UTF8&node=2690953011`) and search queries (eg. `iphone`) can now be watched. This will cache the entires found when first running the `watch` command, and will update the cache and send price alerts on subsequent price checks.

Due to this, the watch command required a bit of a rework, and now uses arguments to specify which type you are watching. Here's how it works now (assume prefix = !):

Watch a link:

`!watch -l https://www.amazon.ca/dp/B0813VL2K8/`

Watch a category:

`!watch -c https://www.amazon.ca/Tablets/b/?ie=UTF8&node=2690953011`

Watch the results of a search query (note the + instead of space):

`!watch -q nintendo+switch`

## Proxy Support
If you use a proxy service (preferably paid, free ones are pretty hit and miss) then you can include a `proxylist.txt` file in the main bot folder, where each one is separated by a newline. The file is automatically detected so there is no need for any config changes once you create/add it.

### Bot user setup
To set up the bot user, head to https://discordapp.com/developers and login. From there create a new application, set the name and image to whatever (you can change them later), and then click the "Bot" tab. Click "Add bot user" and once that's created, copy the token and place it in the `config.json` under "token". I doubt this has to be said, but DO NOT share your bot token with ANYONE.

### Guild item limit
You may have noticed the last value, `"guild_item_limit"`. This value can be changed, but at the risk of being flagged as a bot and breaking everything. I don't even know if 5 is too high or low, so just... keep it as low as possible?

### Cache limit
Due to the local storage-y nature of the watchable `category` and `query` items, it has to store some cache. If you worry about data loss, you can make this a small number, like 5 or 10. Otherwise, go nuts, I think you'll be storing at most like 30 items. 

### Required Permissions
The `required_perms` field is an optional list of permissions that a user with be required to have for running any command that changes the watchlist in any way. You can leave this empty if you want anybody to be able to use them.

It is an array, so the format is `["permission_1", "permission_2"]`. You can refer to Discord permissions [here](https://discordapp.com/developers/docs/topics/permissions) (you can use the permission name, eg "MANAGE_MESSAGES")

### TLD
A **Top Level Domain** (or TLD) is just the `.com` or `.ca` of a URL. If you want searches to be local to your country's Amazon, say, `www.amazon.de`, you can set your TLD in the config to `de`. More examples include:

`ca` - Canada

`co.uk` - UK

`com` - America (default)

### autoCartLink
If you'd link for the bot to generate a link that will automatically add the item to the users cart when they click it, set this to `true`.
```json
"autoCartLink":true
```

### URLParams
If you want to include a referral code or something, you can use the `URLParams` object. It is formatted like this:
```json
"URLParams":{
  "ref":"my_ref_code",
  "tag":"my_tag"
  etc...
 }
```
### ebayAverage
**REMOVED DUE TO API REMOVAL**

## Starting it up
Now that everything is set up config-wise, you now need to install the dependancies! This can be done by running `npm install` inside of the root folder of the project. This should download everything you need.

Once that's done, all you (should) need to do is run `node index` in the root project folder and it should come to life!

## Inviting it to your server
Once you've got the bot running properly, you can invite it to your server by going to the `OAuth2` tab on the bots application page you set up previously. Once you're there, under `scopes` check the box that says `bot`, and copy/paste the link it generates into your browser.

## Something not working?
Google it!

Unless it's like, *super* broken, which then you should create an issue.

#### Donations
I don't expect anything from anyone, and this bot will be free forever, but if you'd like to throw a Redbull or something my way, you can do so [here](https://www.paypal.me/spikegd) :)
