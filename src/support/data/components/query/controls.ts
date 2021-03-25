import { DataFormControl } from "../../../form/components/DataForm";

export function sorting(field: string): DataFormControl {
    return {
        type: 'select',
        name: 'sort',
        label: 'Direction',
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

export function containsFilter(field: string): DataFormControl {
    return {
        type: 'text',
        name: field,
        label: 'Contains'
    }
}