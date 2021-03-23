import objectPath from "object-path";

export function readField<T>(obj: any, path: string): T {

    let value = objectPath.get(obj, path);

    if (typeof value === 'undefined') {
        throw new Error(`${path} is undefined!`);
    }

    return value as T;
}

export function hasField(obj: any, path: string): boolean {
    return objectPath.has(obj, path);
}

export function tryField<T>(obj: any, path: string, defaultValue: T): T {
    return objectPath.get(obj, path, defaultValue);
}

export function ucFirst(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1)
}

export function cloneExcept<T>(o: T, ...excluded: string[]): any {
    let result = Object.assign({}, o) as any;

    excluded.forEach(e => delete result[e]);

    return result;
}

export function cloneWith<T, S>(o: T, source: S): T & S {
    return Object.assign({}, o, source);
}

export function mergeWith<T, S>(target:T, source:S) {
    Object.assign(target, source);
}

export function clone<T>(o: T): T {
    return Object.assign({}, o);
}

export function objectEmpty<T>(o:T): boolean {
    return Object.keys(o).length === 0;
}

export function transferTo(source: any, target: any){
    Object.keys(source).forEach(property => {

        let value = source[property];

        if (typeof value !== 'undefined' && value !== null) {
            target[property] = value;
        }
    });
}

export function cloneArray<T>(a: T[]): T[] {
    return [...a];
}

export function cloneArrayWith<T>(a: T[], ...extra: T[]): T[] {
    return [...a, ...extra];
}

export function cloneArrayExcept<T>(a: T[], ...excluded: T[]): T[] {
    return a.filter(e => excluded.indexOf(e) === -1);
}

export function cloneArrayWithReplace<T>(a: T[], source: T, target: T) {
    return a.map(e => e === source ? target : e);
}

export function valueByPath(path: string, source: any): any {
    let parts = path.split('.');

    for (let part of parts) {
        source = source[part];

        if (typeof source === 'undefined' || source === null) {
            return source;
        }
    }

    return source;
}

export function fromCamelCaseToHumanCase(text: string): string {
    return text
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, s => s.toUpperCase())
}

export function fromAllCapsToHumanCase(text: string): string {
    if (text === null || typeof text === 'undefined') {
        return text;
    }

    return text.toLowerCase().split('_').map(w => ucFirst(w)).join(' ');
}
