import {StringUtils} from './StringUtils';

interface timerModel {
    id: string
}

interface timerHash {
    [index: string]: timerModel
}

export class TimerManager {
    private timerHash: timerHash = {};
    private _hashCount: number = 0;

    get HashCount(): number {
        return this._hashCount;
    }
    
    public addTimer(seconds: number, hashKey: string, func: (x: any) => void, param: any): string | null {
        if (this._hashCount > 1000) {
            return null;
        }
        this._hashCount++; //increment before we get id, because we dont want an id of zero (falsey)
        let myId = StringUtils.pad(this._hashCount, 4, '0');
        this.timerHash[hashKey] = { id: myId };
        let timeMilliseconds = seconds * 1000;
        setTimeout(func, timeMilliseconds, param);
        return myId;
    }
    
    public removeTimer(hashKey: string): void {
        delete this.timerHash[hashKey];
        this._hashCount--;
    }
}