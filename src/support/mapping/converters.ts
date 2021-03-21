import { isBlank } from "../validation/utils";
import moment, {Moment} from 'moment';

export function toNumber(value: any): number {
    if (typeof value === 'number') {
        return value;
    }

    if (typeof value === 'string') {
        return parseFloat(value);
    }

    throw new Error("Unable to convert the provided value to number!");
}

export function toMoney(value: any): string {
    return toNumber(value).toFixed(2);
}

export function toNullIfBlank(value: any): any|null {
    return isBlank(value) ? null : value;
}

export function toMoment(v: string | null | undefined): Moment | null | undefined {
    if (typeof v !== 'string') {
        return v;
    }

    return moment(v);
}

export function formatMoment(pattern: string): (v:Moment | null | undefined) => string |  null | undefined {
    return v => {
        if (typeof v !== 'object') {
            return v;
        }
        return  v!.format(pattern)
    };
}