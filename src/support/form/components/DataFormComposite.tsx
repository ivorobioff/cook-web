import React, { Component, ReactElement } from 'react';
import { DataFormCommonProps } from './DataForm';

export interface DataFormInternalProps extends DataFormCommonProps {
    unwrap: boolean;
}

export type DataFormProvider = (props: DataFormInternalProps) => ReactElement;

export interface DataFormCompositeProps extends DataFormCommonProps {
    forms: DataFormProvider[];
}

interface DataFormCompositeState {

}

class DataFormComposite extends Component<DataFormCompositeProps, DataFormCompositeState> {
    
    render() {

        const {
            className,
            autoComplete,
            forms
        } = this.props;

        return (<form noValidate autoComplete={autoComplete} className={className}>
            { forms.map(form => {

                const props: DataFormInternalProps = {
                    unwrap: true
                }

                return form(props);
            }) }
        </form>)
    }
}

export default DataFormComposite;