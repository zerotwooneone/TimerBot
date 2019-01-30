export class Coercion {
    static ToInt(): (s: string) => number | null {
        return (stringValue: string) => {
            let intValue = parseInt(stringValue);
            if (Number.isNaN(intValue)) {
                return null;
            }
            return intValue;
        }
    }
    static ToString(): (s: string) => string {
        return (stringValue: string) => {
            return stringValue;
        }
    }
}