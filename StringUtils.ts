export class StringUtils {
    static pad(input: any, width: any, padCharacter: any): string {
        padCharacter = padCharacter || '0';
        input = input + '';
        return input.length >= width ? input : new Array(width - input.length + 1).join(padCharacter) + input;
    }
}