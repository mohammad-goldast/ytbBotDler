![YouTube Bot Downloader Script](http://s6.uplod.ir/i/00820/1049l36473np.jpg)

# ytbBotDler
YouTube Bot Downloader Script , This script was made for a Telegram bot that allows you to download any Movies/Clips from YouTube .
## Dependencies
This script requires following package to be installed .

 - bot-brother
 - youtube-dl

Also, you need to create a [Telegram Bot](https://core.telegram.org/bots).

## How to install
To install this script, run these commands:

    $ git clone https://github.com/blackhair/ytbBotDler.git
    $ cd ytbBotDler
    $ npm install

Now you must change the API key in server.js file.
    
    var bot = bb({
      key: 'YOUR-API-KEY',
      sessionManager: bb.sessionManager.memory(),
      polling: { interval: 0, timeout: 1 }
    });
Then just run the below command and join with your Telegram Bot :
    
    $ node server.js
