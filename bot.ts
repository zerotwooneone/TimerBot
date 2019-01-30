import Discord = require('discord.io');
import logger = require('winston');
import * as auth from './auth.json';
import { ValueStrategy } from "./ValueStrategy";
import {Coercion} from './Coercion';
import {TimerManager} from './TimerManager';

// Configure logger settings
var timerManager = new TimerManager();
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
    "-s": { handleValue: HandleValue("newTimerSeconds"), valueStrategy: ValueStrategy.NextArg, coerceValue: Coercion.ToInt() },
    "--seconds": { handleValue: HandleValue("newTimerSeconds"), valueStrategy: ValueStrategy.NextArg, coerceValue: Coercion.ToInt() },
    "-n": { handleValue: HandleValue("timerName"), valueStrategy: ValueStrategy.NextArgWithQuotes, coerceValue: Coercion.ToString() },
    "--name": { handleValue: HandleValue("timerName"), valueStrategy: ValueStrategy.NextArgWithQuotes, coerceValue: Coercion.ToString() },
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
                let hashKey = getHashKey(channelID);
                let timerParam: timerParam = {
                    onComplete: () => {
                        bot.sendMessage({
                            to: channelID,
                            message: `<@${userID}> Timer Elapsed. ${parsed.timerName}`
                        });
                    },
                    hashKey: hashKey
                };
                let timerId = timerManager.addTimer(parsed.newTimerSeconds, hashKey, onTimer, timerParam)
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

interface timerParam {
    onComplete: () => void,
    hashKey: string
}

function onTimer(arg: timerParam):void {
    if (arg.onComplete && typeof arg.onComplete === 'function') {
        arg.onComplete();
    }
    timerManager.removeTimer(arg.hashKey);
}

function getHashKey(channelID: string): string {
    let hashKey = `channel:${channelID}-id:${timerManager.HashCount}`;
    return hashKey;
}

