export class ValueStrategy {
    static NextArg(state: any): string {
        return state.getNextValue();
    }
    static NextArgWithQuotes(state: any): string {
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
                }
                else {
                    result = result + " " + value;
                }
            }
            return value;
        }
        else {
            return value;
        }
    }
}
