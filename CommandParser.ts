interface ValueState {
    [key: string]: any;
}

interface ValueHandler {
    (value: any, state: ValueState): void
}

interface ValueStrategy {
    (state: ValueState): string;
}

interface ValueCoercion {
    (value: string): any;
}

interface CommandHandler {
    handleValue: ValueHandler,
    valueStrategy: ValueStrategy,
    coerceValue: ValueCoercion
}

export interface Commands {
    [key: string]: CommandHandler
}

export function HandleValue(stateKey: any): ValueHandler {
    return (value: any, state: any) => state[stateKey] = value;
}

export class CommandParser {
    constructor(private commands: Commands) {

    }
    public Parse(args: string[]): {} {
        let state = {};
        for (const handlerKey in this.commands) {
            let argIndex = args.indexOf(handlerKey);
            if (argIndex != -1) {
                let nextValueIndex = argIndex + 1;
                let argState = { getNextValue: () => args[nextValueIndex++] };
                let handler = this.commands[handlerKey];
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
}