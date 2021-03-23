import React, { Component, Fragment, ReactElement } from 'react';
import { cloneExcept, cloneWith, mergeWith, objectEmpty } from '../../random/utils';
import { DataFormCommonProps, DataFormResult, DataFormErrors, DataFormHook } from './DataForm';

export interface DataFormCompositeInternalProps extends DataFormCommonProps {
    unwrap: boolean;
}

interface DataFormCompositeInternalElement {
    hook?: DataFormHook;
    source: DataFormCompositeElement;
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
    elements: DataFormCompositeInternalElement[];
}

class DataFormComposite extends Component<DataFormCompositeProps, DataFormCompositeState> {

    get totalForms(): number {
        return this.props.elements.filter(e => e.type === 'form').length;
    }

    constructor(props: DataFormCompositeProps) {
        super(props);

        this.state = {
            elements: this.createInternalElements(this.props.elements)
        };

        if (props.hook) {
            props.hook.provider = this.prepareResult.bind(this);
        }
    }

    private createInternalElements(elements: DataFormCompositeElement[]): DataFormCompositeInternalElement[] {
        return elements.map(element => ({
            source: element,
            hook: element.type === 'form' ? new DataFormHook()  : undefined  
        }));
    }
    

    private prepareResult(): DataFormResult | null {
        let mergedData: DataFormResult = {};

        let failed = false;

        for (let element of this.state.elements) {
            if (element.hook) {
                const provider = element.hook!.provider!;

                const data = provider();

                if (data) {
                    mergeWith(mergedData, data)
                } else {
                    failed = true;
                }
            }    
        }

        if (failed) {
            return null;
        }

        if (this.props.onValidate) {
            const errors = this.props.onValidate(mergedData);

            if (!objectEmpty(errors)) {
                this.setState({ errors });

                return null;
            }
        }

        return mergedData;
    }
    
    render() {

        const {
            className,
            autoComplete
        } = this.props;

        const {
            errors,
            elements
        } = this.state;

        return (<form noValidate autoComplete={autoComplete} className={className}>
            { elements.map((element, i) => {

                const component = element.source.component;
                const hook = element.hook;

                if (typeof component !== 'function') {
                    return (<Fragment key={`e-${i}`}>{component}</Fragment>);
                }
                
                const internalProps = cloneWith(cloneExcept(this.props, 'onValidate'), {
                    unwrap: true,
                    hook,
                    errors
                });

                return (<Fragment key={`e-${i}`}>{component(internalProps)}</Fragment>);
            }) }
        </form>)
    }

    componentDidUpdate(prevProps: DataFormCompositeProps) {
        const currentErrors = this.props.errors;
        const prevErrors = prevProps.errors;

        if (currentErrors !== prevErrors) {
            this.setState({ errors: currentErrors });
        }

        const currentElements = this.props.elements;
        const prevElements = prevProps.elements;

        if (currentElements !== prevElements) {
            this.setState({
                elements: this.createInternalElements(currentElements)
            });
        }
    }
}

export default DataFormComposite;