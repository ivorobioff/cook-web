import {isMoney, isPositiveFloat, isEmail, isFloat, isZeroOrPositiveInt, isPositiveInt, isZeroOrPositiveFloat, isMoment, isPresentOrFuture} from "./utils";

export function checkAll(...checkers: ((value: any) => string | null)[]): (value: any) => string | null {
    return (v) => {
        for (let checker of checkers) {
            const error = checker(v);

            if (error) {
                return error;
            }
        }

        return null;
    }
}

export function checkPositiveInt(value: any): string | null {
    return isPositiveInt(value) ? null : 'Must be a positive whole number'
}

export function checkZeroOrPositiveInt(value: any): string | null {
    return isZeroOrPositiveInt(value) ? null : 'Must be zero or a positive whole number'
}

export function checkZeroOrPositiveFloat(value: any): string | null {
    return isZeroOrPositiveFloat(value) ? null : 'Must be zero or a positive whole/fractional number'
}

export function checkPositiveFloat(value: any): string | null {
    return isPositiveFloat(value) ? null : 'Must be a positive whole/fractional number'
}

export function checkMoney(value: any): string | null {
    return isMoney(value) ? null : 'Invalid money format'
}

export function checkEmail(value: any): string | null {
    return isEmail(value) ? null : 'Invalid email address';
}

export function checkMax(value: any, max: number): string | null {

    if (!isFloat(value)) {
        throw new Error('Number is expected!');
    }

    if (value > max) {
        return `must be less than, or equal to ${max}`;
    }

    return null;
}

export function checkLength(value: any, min: number, max?: number) {
    if (typeof value !== 'string') {
        throw new Error('String is expected!');
    }

    let message = `must contain min. ${min}`;

    if (max) {
        message += `, and max. ${max}`
    }

    message += ' characters';
    
    let length = value.length;

    if (length < min) {
        return message;
    }

    if (max && length > max) {
        return message;
    }

    return null;
}

export function checkMoment(format: string) {
    return (value: any) => {
        if (!isMoment(value, format)) {
            return 'Must be ' + format;
        }

        return null;
    }
}

export function checkPresentOrFuture(format: string) {
    return (value: any) => {
        if (!isPresentOrFuture(value, format)) {
            return 'Must be present or future';
        }

        return null;
    }
}