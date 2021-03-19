import React, { Component } from 'react';
import Popup from "./Popup";
import {readField} from "../../random/utils";
import {Observable} from "rxjs";
import { singleton } from '../../mapping/operators';

export type ConfirmationHandler = () => Observable<any>;

export interface ConfirmationProps {
    onClose: () => void;
    onHandle?: ConfirmationHandler;
    confirmButtonTitle?: string;
    title: string;
    open: boolean;
}


interface ConfirmationState {

}

class Confirmation extends Component<ConfirmationProps, ConfirmationState> {

    constructor(props: ConfirmationProps) {
        super(props);

        this.state = {};
    }

    render() {
        const {
            open,
            title,
            children,
            confirmButtonTitle = 'Confirm',
            onClose
        } = this.props;

        return (<Popup
            onHandle={this.handle.bind(this)}
            onClose={onClose}
            submitButtonTitle={confirmButtonTitle}
            cancelButtonTitle="Cancel"
            open={open}
            title={title}>
            {children}

        </Popup>);
    }

    handle(): Observable<boolean|undefined>  {
        return singleton<boolean|undefined>((done, reject) => {
            readField<ConfirmationHandler>(this.props, 'onHandle')()
                .subscribe(done, error => {
                    reject('Oops! Something went wrong. Please try again.');
                    console.error(error);
                });
        });
    }

}

export default Confirmation;