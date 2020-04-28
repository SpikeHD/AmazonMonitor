# AmazonMonitor
A Discord bot that monitors Amazon items, and notifies you on price drops/restocks

## Disclaimer
As much as I would love for this to be publicly hosted, watching *that many* Amazon items would surely not be feasible, which is why it has to be self-hosted.

## Requirements
* NodeJS v12.2 or higher
* MySQL

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
  "guild_item_limit":5
}
```
Filling in the proper values of course. We'll go over each of them specifically below.

### Bot user setup
To set up the bot user, head to https://discordapp.com/developers and login. From there create a new application, set the name and image to whatever (you can change them later), and then click the "Bot" tab. Click "Add bot user" and once that's created, copy the token and place it in the `config.json` under "token". I doubt this has to be said, but DO NOT share your bot token with ANYONE.

### Database setup
Install MySQL for your preferred platform, and enter a couple commands into the MySQL terminal:

1. `CREATE DATABASE [your database name]`
2. `USE [your database name]`
3. `CREATE TABLE watchlist (guild_id VARCHAR(30) NOT NULL, channel_id VARCHAR(30) NOT NULL, link MEDIUMTEXT NOT NULL, lastPrice FLOAT NOT NULL DEFAULT 0, item_name TEXT NOT NULL)`

Once the database and table is created, fill in the values in your `config.json`.

### Guild item limit
You may have noticed the last value, `"guild_item_limit"`. This value can be changed, but at the risk of being flagged as a bot and breaking everything. I don't even know if 5 is too high or low, so just... keep it as low as possible?

## Starting it up
Now that everything is set up config-wise, you now need to install the dependancies! This can be done by running `npm install` inside of the root folder of the project. This should download everything you need.

Once that's done, all you (should) need to do is run `node index` in the root project folder and it should come to life!

## Something not working?
Google it!

Unless it's like, *super* broken, which then you should create an issue.
