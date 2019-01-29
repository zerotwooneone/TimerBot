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
var commandHandler = {
    "-s": { handleValue: HandleValue("newTimerSeconds"), valueStrategy: NextArg, coerceValue: CoerceInt()},
    "--seconds": { handleValue: HandleValue("newTimerSeconds"), valueStrategy: NextArg, coerceValue: CoerceInt()}
}
function CoerceInt(){
    return (stringValue)=>{
        let intValue = parseInt(stringValue);
        if(Number.isNaN(intValue)){
            return;
        }
        return intValue;
    }
}
function NextArg(state){
    return state.getNextValue();
}
function HandleValue(stateKey){
    return (value, state)=>state[stateKey] = value;
}
function Parse(commands, args){
    let state = {};
    for (const handlerKey in commands) {
        let argIndex = args.indexOf(handlerKey);
        if(argIndex != -1){
            let argState = {getNextValue: ()=>args[argIndex+1]};
            let arg = args[argIndex];
            let handler = commands[handlerKey];
            let value;
            if(handler.valueStrategy){
                value = handler.valueStrategy(argState);
            }
            if(handler.coerceValue){
                value = handler.coerceValue(value);
            }
            handler.handleValue(value, state);
        }
    }
    return state;
}
bot.on('message', function (user, userID, channelID, message, evt) {
    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`
    if (message.substring(0, 1) == '!') {
        var args = message.substring(1).split(' ');
        var cmd = args[0];

        args = args.splice(1);
        switch (cmd) {
            case 'timer':
                let parsed = Parse(commandHandler, args);
                if (parsed.newTimerSeconds === undefined ||
                    parsed.newTimerSeconds === null ||
                    Number.isNaN(parsed.newTimerSeconds)) {
                    bot.sendMessage({
                        to: channelID,
                        message: `<@${userID}> you must provide a number of seconds. !timer --seconds 5`
                    });
                    break;
                }
                if (parsed.newTimerSeconds < 1) {
                    bot.sendMessage({
                        to: channelID,
                        message: `<@${userID}> the number of seconds must be > 0`
                    });
                    break;
                }
                if (parsed.newTimerSeconds > 65535) {
                    bot.sendMessage({
                        to: channelID,
                        message: `<@${userID}> the number of seconds is too large`
                    });
                    break;
                }
                let timerId = addTimer(channelID, parsed.newTimerSeconds, userID);
                if (timerId) {
                    bot.sendMessage({
                        to: channelID,
                        message: `<@${userID}> Starting Timer for ${parsed.newTimerSeconds} seconds. Id : ${timerId}`
                    });
                }

                break;
        }
    }
});

function onTimer(arg) {
    bot.sendMessage({
        to: arg.channelID,
        message: `<@${arg.userID}> Timer Elapsed. Id : ${arg.id}`
    });
    removeTimer(arg.channelID, arg.id);
}

function addTimer(channelID, seconds, userID) {
    if (hashCount > 1000) {
        return null;
    }
    let hashKey = getHashKey(channelID, hashCount);
    timerHash[hashKey] = {};
    hashCount++; //increment before we get id, because we dont want an id of zero (falsey)
    let myId = pad(hashCount, 4);
    let timeMilliseconds = seconds * 1000;
    setTimeout(onTimer, timeMilliseconds, { channelID: channelID, id: myId, userID: userID });
    return myId;
}

function removeTimer(channelID, id) {
    let hashKey = getHashKey(channelID, id);
    delete timerHash[hashKey];
    hashCount--;
}

function getHashKey(channelID, id) {
    let hashKey = `channel:${channelID}-id:${id}`;
    return hashKey;
}

function pad(input, width, padCharacter) {
    padCharacter = padCharacter || '0';
    input = input + '';
    return input.length >= width ? input : new Array(width - input.length + 1).join(padCharacter) + input;
}