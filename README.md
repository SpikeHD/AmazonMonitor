# AmazonMonitor
A Discord bot that monitors Amazon items, and notifies you on price drops/restocks

## Important!
Before updating you should always check here in case of any database/config changes you may need to set.

### Moving to 1.1.0: 
If you've already got it set up a little while ago, make sure to run `ALTER TABLE watchlist ADD COLUMN priceLimit FLOAT NOT NULL DEFAULT 0;` in the MySQL terminal after pulling as this will add the price limit functionality.

## Before you start
"Why isn't this public?" you may ask. Well, the simple answer is that Amazon doesn't really like bots. When a program like this sends a ton of requests to Amazon all at once, they tend to catch on and start asking for human verification. Having 5 watched items per server, in even just 10 servers, is **50 requests per 2 minutes** (not accounting for the 6-second buffer per request that is used to deter said verification). This *also* means that this can break at basically any moment, so if it all of a sudden stops working without any code changes, *please* don't make an issue for it, just maybe give the bot a rest and lower your watchlist.

## Requirements
* [NodeJS v12.2 or higher](https://nodejs.org/en/)
* MySQL ([Windows](https://www.wikihow.com/Install-the-MySQL-Database-Server-on-Your-Windows-PC), [Ubuntu](https://itsfoss.com/install-mysql-ubuntu/), [Mac](https://www.thoughtco.com/installing-mysql-on-mac-2693866))

## Setup
Setup is easy enough. Clone the repo somewhere and create a file in the main folder (the one with `index.js` in it) named `config.json`. Fill in the contents of `config.json` using this:

```json
{
  "prefix":"YOUR_PREFIX",
  "token":"YOUR_BOT_TOKEN",
  "sql": {
    "host":"DATABASE_HOST (probably just 'localhost')",
    "database":"DATABASE_NAME",
    "user":"DATABASE_USER",
    "password":"DATABASE_PASSWORD"
  },
  "URLParams":{},
  "guild_item_limit":5,
  "required_perms":[],
  "debugEnabled":false
}
```
Filling in the proper values of course. We'll go over each of them specifically below.

### Bot user setup
To set up the bot user, head to https://discordapp.com/developers and login. From there create a new application, set the name and image to whatever (you can change them later), and then click the "Bot" tab. Click "Add bot user" and once that's created, copy the token and place it in the `config.json` under "token". I doubt this has to be said, but DO NOT share your bot token with ANYONE.

### Database setup
Install MySQL for your preferred platform, and enter a couple commands into the MySQL terminal:

1. `CREATE DATABASE [your database name];`
2. `USE [your database name];`
3. `CREATE TABLE watchlist (guild_id VARCHAR(30) NOT NULL, channel_id VARCHAR(30) NOT NULL, link MEDIUMTEXT NOT NULL, lastPrice FLOAT NOT NULL DEFAULT 0, item_name TEXT NOT NULL, priceLimit FLOAT NOT NULL DEFAULT 0);`

Once the database and table is created, fill in the values in your `config.json`.

### Guild item limit
You may have noticed the last value, `"guild_item_limit"`. This value can be changed, but at the risk of being flagged as a bot and breaking everything. I don't even know if 5 is too high or low, so just... keep it as low as possible?

### Required Permissions
The `required_perms` field is an optional list of permissions that a user with be required to have for running any command that changes the watchlist in any way. You can leave this empty if you want anybody to be able to use them.

It is an array, so the format is `["permission_1", "permission_2"]`. You can refer to Discord permissions [here](https://discordapp.com/developers/docs/topics/permissions) (you can use the permission name, eg "MANAGE_MESSAGES")

### URLParams
If you want to include a referral code or something, you can use the `URLParams` object. It is formatted like this:
```json
"URLParams":{
  "ref":"my_ref_code",
  "tag":"my_tag"
  etc...
 }
```
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
