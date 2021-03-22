import * as EmailValidator from 'email-validator';
import moment from 'moment';

export function isBlank(value: any): boolean {

    if (Array.isArray(value) && value.length === 0) {
        return true;
    }

    return value === null
        || typeof value === 'undefined'
        || (typeof value === 'string' && value.trim().length === 0);
}

export function isFloat(value: any): boolean {

    if (typeof value !== 'number' && typeof value !== 'string') {
        return false;
    }

    return /^(-)?\d+(\.\d+)?$/.test(value + '' || '');
}

export function isMoney(value: any): boolean {
    if (typeof value !== 'number' && typeof value !== 'string') {
        return false;
    }

    return /^\d+(\.\d(\d)?)?$/.test(value + '' || '');
}

export function isEmail(value: any): boolean {
    if (typeof value !== 'string') {
        return false;
    }
    
    return EmailValidator.validate(value);
}

export function isZeroOrPositiveFloat(value: any): boolean {
    return isFloat(value) && parseFloat(value) >= 0;
}

export function isPositiveFloat(value: any): boolean {
    return isFloat(value) && parseFloat(value) > 0;
}


export function isInt(value: any): boolean {

    if (typeof value !== 'number' && typeof value !== 'string') {
        return false;
    }

    return /^(-)?\d+$/.test(value + '' || '');
}

export function isZeroOrPositiveInt(value: any): boolean {
    return isInt(value) && parseInt(value) >= 0;
}

export function isPositiveInt(value: any): boolean {
    return isInt(value) && parseInt(value) > 0;
}

export function isMoment(value: any, format: string): boolean  {
    return moment(value, format, true).isValid();
}

export function isPresentOrFuture(value: any, format: string): boolean {
    if (!isMoment(value, format)) {
        return false;
    }

    return moment(value, format).isSameOrAfter(moment(), 'date');
}