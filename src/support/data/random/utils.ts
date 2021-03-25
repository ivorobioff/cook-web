import { isBlank } from "../../validation/utils";

export function normalizeQuery(query?: {[name: string]: any}): {[name: string]: string} {
    const result: {[name: string]: string} = {};

    if (!query) {
        return result;
    }

    Object.keys(query).forEach(key => {
        let value = query[key];

        if (!isBlank(value)) {

            if (Array.isArray(value)) {
                value = value.join(',');
            }

            result[key] = value;
        }
    });

    return result;
}