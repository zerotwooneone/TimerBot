var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');
// Configure logger settings
var timerHash = {};
var hashCount = 0;
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';
// Initialize Discord Bot
var bot = new Discord.Client({
    token: auth.token,
    autorun: true
});
bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
});
bot.on('message', function (user, userID, channelID, message, evt) {
    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`
    if (message.substring(0, 1) == '!') {
        var args = message.substring(1).split(' ');
        var cmd = args[0];

        args = args.splice(1);
        switch (cmd) {
            // !ping
            case 'ping':
                bot.sendMessage({
                    to: channelID,
                    message: 'Pong!'
                });
            case 'timer':
                let seconds = parseInt(args[0]);
                if (Number.isNaN(seconds)) {
                    bot.sendMessage({
                        to: channelID,
                        message: 'you must provide a number of seconds'
                    });
                    break;
                }
                if (seconds < 1) {
                    bot.sendMessage({
                        to: channelID,
                        message: 'the number of seconds must be > 0'
                    });
                    break;
                }
                if (seconds > 65535) {
                    bot.sendMessage({
                        to: channelID,
                        message: 'the number of seconds is too large'
                    });
                    break;
                }

                bot.sendMessage({
                    to: channelID,
                    message: 'Starting Timer for ' + seconds + ' seconds.'
                });
                addTimer(channelID, seconds);

                break;
            // Just add any case commands if you want to..
        }
    }
});

function onTimer(arg) {
    bot.sendMessage({
        to: arg.channelID,
        message: 'Timer Elapsed'
    });
    removeTimer(arg.channelID, arg.id);
}

function addTimer(channelID, seconds) {
    if (hashCount > 1000) {
        return -1;
    }
    let hashKey = getHashKey(channelID, hashCount);
    timerHash[hashKey] = {};
    let myId = hashCount;
    hashCount++;
    let timeMilliseconds = seconds * 1000;
    setTimeout(onTimer, timeMilliseconds, { channelID: channelID, id: myId });
    return myId;
}

function removeTimer(channelID, id) {
    let hashKey = getHashKey(channelID, id);
    delete timerHash[hashKey];
    hashCount--;
}

function getHashKey(channelID, id) {
    let hashKey = `channel${channelID}-${id}`;
    return hashKey;
}