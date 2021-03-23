import React, { Component, Fragment, ReactElement } from 'react';
import { cloneExcept, cloneWith, mergeWith, objectEmpty } from '../../random/utils';
import { DataFormCommonProps, DataFormResultProvider, DataFormResult, DataFormErrors } from './DataForm';

export interface DataFormCompositeInternalProps extends DataFormCommonProps {
    unwrap: boolean;
}

export type DataFormCompositeComponentProvider = (props: DataFormCompositeInternalProps) => ReactElement;

export interface DataFormCompositeElement {
    type: 'form' | 'custom';
    component: DataFormCompositeComponentProvider | ReactElement;
}

export interface DataFormCompositeProps extends DataFormCommonProps {
    elements: DataFormCompositeElement[];
}

interface DataFormCompositeState {
    errors?: DataFormErrors;
}

class DataFormComposite extends Component<DataFormCompositeProps, DataFormCompositeState> {

    private providers: DataFormResultProvider[] = [];

    get totalForms(): number {
        return this.props.elements.filter(e => e.type === 'form').length;
    }

    constructor(props: DataFormCompositeProps) {
        super(props);

        this.state = {};
    }
    
    render() {

        const {
            className,
            autoComplete,
            elements
        } = this.props;

        const {
            errors
        } = this.state;

        return (<form noValidate autoComplete={autoComplete} className={className}>
            { elements.map((element, i) => {

                const internalProps = cloneWith(cloneExcept(this.props, 'onValidate'), {
                    unwrap: true,
                    onReady: this.ready.bind(this),
                    errors
                });

                if (typeof element.component !== 'function') {
                    return (<Fragment key={`e-${i}`}>{element.component}</Fragment>);
                }

                return (<Fragment key={`e-${i}`}>{element.component(internalProps)}</Fragment>);
            }) }
        </form>)
    }

    componentDidUpdate(prevProps: DataFormCompositeProps) {
        const currentErrors = this.props.errors;
        const prevErrors = prevProps.errors;

        if (currentErrors !== prevErrors) {
            this.setState({ errors: currentErrors });
        }
    }

    ready(provider: DataFormResultProvider) {
        this.providers.push(provider);
        
        if (this.providers.length === this.totalForms && this.props.onReady) {

            const providers = this.providers;
            this.providers = [];

            this.props.onReady(() => {
                let mergedData: DataFormResult = {};

                providers.forEach(provider => mergeWith(mergedData, provider()));

                if (this.props.onValidate) {
                    const errors = this.props.onValidate(mergedData);

                    if (!objectEmpty(errors)) {
                        this.setState({ errors });

                        return null;
                    }
                }

                return mergedData;
            });
        }
    }

}

export default DataFormComposite;