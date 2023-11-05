# FAQ (Or I guess more of an FES - Frequently Encountered Scenarios)

Problems with something? Here's where you might find some answers!

### I'm getting a "failed to load shared libraries" error!

Looks like you're missing some Puppeteer dependencies! See [this Medium article](https://medium.com/@ssmak/how-to-fix-puppetteer-error-while-loading-shared-libraries-libx11-xcb-so-1-c1918b75acc3) for a solution

### I'm on an ARM machine!

Noted in [this issue](https://github.com/SpikeHD/AmazonMonitor/issues/44), you're going to need to set your Chromium path manually. To do so, set a `custom_chromium_exec` in your `config.json`.
  
### Items will sometimes have empty data/show no price when there is one/etc!

This is unfortunately a common problem and a limitation of web scraping. 99% of the time something like this happens, it means the bot is temporarily flagged, and Amazon is returning a Captcha instead of the item or page you're trying to get.

If you're a bit tech-savvy and want to see if this is the case, use `curl` or something similar to output the HTML for the item or page you're trying to view.

The best solution to this problem? Wait (or use a proxylist). Take the bot down for a few minutes, increase the time between price checks, and try again.
