import Discord = require('discord.io');
import logger = require('winston');
import * as auth from './auth.json';
// Configure logger settings
var timerHash: { [index: string]: { id: string } } = {};
var hashCount: number = 0;
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console);
logger.level = 'debug';
// Initialize Discord Bot
var bot = new Discord.Client({
    token: auth.token,
    autorun: true
});
bot.on('ready', function (evt: any) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
});
var commandHandler = {
    "-s": { handleValue: HandleValue("newTimerSeconds"), valueStrategy: NextArg, coerceValue: CoerceInt() },
    "--seconds": { handleValue: HandleValue("newTimerSeconds"), valueStrategy: NextArg, coerceValue: CoerceInt() },
    "-n": { handleValue: HandleValue("timerName"), valueStrategy: NextArgWithQuotes, coerceValue: CoerceString() },
    "--name": { handleValue: HandleValue("timerName"), valueStrategy: NextArgWithQuotes, coerceValue: CoerceString() },
}
function CoerceInt(): (s: string) => number | null {
    return (stringValue: string) => {
        let intValue = parseInt(stringValue);
        if (Number.isNaN(intValue)) {
            return null;
        }
        return intValue;
    }
}
function CoerceString(): (s: string) => string {
    return (stringValue: string) => {
        return stringValue;
    }
}
function NextArg(state: any): string {
    return state.getNextValue();
}
function NextArgWithQuotes(state: any): string {
    let value = state.getNextValue();
    if (value && value.startsWith('"')) {
        let result = value.substring(1);
        const maxArgSteps = 10000;
        for (let argStepCount = 0; argStepCount < maxArgSteps; argStepCount++) {
            value = state.getNextValue();
            if (value === null || value === undefined) {
                return result;
            }
            let quoteIndex = value.indexOf('"');
            if (quoteIndex >= 0) {
                result = result + " " + value.substring(0, quoteIndex);
            } else {
                result = result + " " + value;
            }
        }
        return value;
    } else {
        return value;
    }
}
function HandleValue(stateKey: any): (value: any, state: any) => void {
    return (value: any, state: any) => state[stateKey] = value;
}
function Parse(commands: any, args: string[]): {} {
    let state = {};
    for (const handlerKey in commands) {
        let argIndex = args.indexOf(handlerKey);
        if (argIndex != -1) {
            let nextValueIndex = argIndex + 1;
            let argState = { getNextValue: () => args[nextValueIndex++] };
            let handler = commands[handlerKey];
            let value;
            if (handler.valueStrategy) {
                value = handler.valueStrategy(argState);
            }
            if (handler.coerceValue) {
                value = handler.coerceValue(value);
            }
            handler.handleValue(value, state);
        }
    }
    return state;
}
bot.on('message', function (user: string, userID: string, channelID: string, message: string, evt: any) {
    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`
    if (message.substring(0, 1) == '!') {
        var args = message.substring(1).split(' ');
        var cmd = args[0];

        args = args.splice(1);
        switch (cmd) {
            case 'timer':
                let parsed: any = Parse(commandHandler, args);
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
                if (parsed.timerName) {
                    const maxTimeNameLength = 64;
                    parsed.timerName = parsed.timerName.substring(0, maxTimeNameLength);
                }
                let hashKey = getHashKey(channelID, hashCount);
                let timerParam = {
                    onComplete: () => {
                        let namePart = parsed.timerName ?
                            `Name: ${parsed.timerName}` :
                            `Id : ${timerHash[hashKey].id}`;
                        bot.sendMessage({
                            to: channelID,
                            message: `<@${userID}> Timer Elapsed. ${namePart}`
                        });
                    },
                    hashKey: hashKey
                };
                let timerId = addTimer(parsed.newTimerSeconds, hashKey, onTimer, timerParam)
                if (timerId) {
                    let namePart = parsed.timerName ?
                        `Name: ${parsed.timerName}` :
                        `Id : ${timerId}`
                    bot.sendMessage({
                        to: channelID,
                        message: `<@${userID}> Starting Timer for ${parsed.newTimerSeconds} seconds. ${namePart}`
                    });
                }

                break;
        }
    }
});

function onTimer(arg: any) {
    if (arg.onComplete && typeof arg.onComplete === 'function') {
        arg.onComplete();
    }
    removeTimer(arg.hashKey);
}

function addTimer(seconds: number, hashKey: string, func: (x: any) => void, param: any): string | null {
    if (hashCount > 1000) {
        return null;
    }
    hashCount++; //increment before we get id, because we dont want an id of zero (falsey)
    let myId = pad(hashCount, 4, '0');
    timerHash[hashKey] = { id: myId };
    let timeMilliseconds = seconds * 1000;
    setTimeout(func, timeMilliseconds, param);
    return myId;
}

function removeTimer(hashKey: string): void {
    delete timerHash[hashKey];
    hashCount--;
}

function getHashKey(channelID: string, id: any): string {
    let hashKey = `channel:${channelID}-id:${id}`;
    return hashKey;
}

function pad(input: any, width: any, padCharacter: any): string {
    padCharacter = padCharacter || '0';
    input = input + '';
    return input.length >= width ? input : new Array(width - input.length + 1).join(padCharacter) + input;
}