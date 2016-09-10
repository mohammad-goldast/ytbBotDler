var youtubedl = require('youtube-dl');
var bb = require('bot-brother');
var fs = require('fs');
var mkdirp = require('mkdirp');
var bot = bb({
  key: 'YOUR-API-KEY',
  sessionManager: bb.sessionManager.memory(),
  polling: { interval: 0, timeout: 1 }
});
 
bot.command('start')
.invoke(function (ctx) {
	
	ctx.data.user = ctx.meta.user;
	
 ctx.sendMessage('Send your video link ...');
})
.answer(function (ctx) {
	ctx.data.answer = ctx.answer;
	var answer = ctx.answer;
	
	function dlAndSend(filename) {
	
		var createStream = fs.createWriteStream(filename);
		video.pipe(createStream);
		ctx.sendVideo(filename);
		
	}

	if (answer.indexOf("youtube.com") > 1) {
		var videoName;
		var video = youtubedl(ctx.answer,
		
		  ['--format=18'],

		  { cwd: __dirname });
		 
		video.on('info', function(info) {
		  	console.log('Download started');
		    console.log('filename: ' + info.filename);
		    console.log('size: ' + info.size);
		    videoName = info.filename;
		    ctx.sendMessage('Download has been started. \n🎞 : ' + info.filename + '\n📥 : ' + info.size*0.001  + ' KB\n\n\nPlease wait ...');
			dlAndSend(videoName);
		});	


			 
	}else{return ctx.sendMessage('Wrong link, Send me another video link');}
});