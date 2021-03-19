import { isBlank } from "../validation/utils";

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