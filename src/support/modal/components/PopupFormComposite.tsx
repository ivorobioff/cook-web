import React, { Component, ReactElement } from 'react';
import { DataFormCommonProps, DataFormProps } from '../../form/components/DataForm';
import DataFormComposite, { DataFormCompositeElement } from '../../form/components/DataFormComposite';
import PopupForm, { PopupFormCommonProps } from './PopupForm';

export interface PopupFormCompositeProps extends PopupFormCommonProps {
    elements: DataFormCompositeElement[];
}

interface PopupFormCompositeState {

}

class PopupFormComposite extends Component<PopupFormCompositeProps, PopupFormCompositeState> {

    createForm(props: DataFormProps): ReactElement {

        const commonProps: DataFormCommonProps = props;

        return (<DataFormComposite { ...commonProps} elements={ this.props.elements } />)
    }

    render() {

        const commonProps: PopupFormCommonProps = this.props;

        return (<PopupForm controls={[]} { ...commonProps } form={this.createForm.bind(this)} />);
    }
}

export default PopupFormComposite;