import { DataFormControl } from "../../../form/components/DataForm";

export function sorting(field: string): DataFormControl {
    return {
        type: 'select',
        name: 'sort',
        label: 'Sort',
        values: { NONE: 'None', ASC: 'Ascending', DESC: 'Descending' },
        uselessIn: 'NONE',
        convertIn: value => value.split(':')[1],
        convertOut: value => {
            if (value === 'NONE') {
                return undefined;
            }

            return `${field}:${value}`;
        }
    }
}

export function textFilter(field: string): DataFormControl {
    return {
        type: 'text',
        name: field,
        label: 'Value'
    }
}

export function manyOptionsFilter(field: string, values: {[name: string]: string}): DataFormControl {
    return {
        type: 'autocomplete',
        name: field,
        values,
        label: 'Options',
        extra: {
            multiple: true
        }
    }
}