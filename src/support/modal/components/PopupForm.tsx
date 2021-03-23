import React, { Component, ReactElement } from 'react';
import Popup from "./Popup";
import DataForm, {DataFormControl, DataFormErrors, DataFormLayoutProvider, DataFormProps, DataFormResult, DataFormResultProvider, DataFormTouchHandler} from "../../form/components/DataForm";
import {Box} from "@material-ui/core";
import {Observable} from "rxjs";
import { singleton } from '../../mapping/operators';

export type PopupFormSubmitHandler = (data: DataFormResult) => Observable<any>;

export interface PopupFormCommonProps {
    open: boolean;
    onSubmit: PopupFormSubmitHandler;
    onClose: () => void;
    onOpen?: () => void;
    title: string;
    onValidate?: (result: DataFormResult) => DataFormErrors;
    fresh?: boolean;
    onTouch?: DataFormTouchHandler;
    layout?: DataFormLayoutProvider;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    touched?: boolean
}

export interface PopupFormProps extends PopupFormCommonProps {
    controls: DataFormControl[];
    form?: (props: DataFormProps) => ReactElement;
}

interface PopupFormState {
    errors?: DataFormErrors;
    globalError?: string;
    touched: boolean;
    failed: boolean;
}

class PopupForm extends Component<PopupFormProps, PopupFormState> {

    private provider?: DataFormResultProvider;

    constructor(props: PopupFormProps) {
        super(props);

        this.state = {
            touched: false,
            failed: false
        };
    }

    componentDidUpdate(prevProps: PopupFormProps) {
        if (prevProps.touched !== this.props.touched && this.props.touched === true) {
            this.touch();
        }
    }

    render() {

        const {
            open,
            title,
            onClose,
            size
        } = this.props;

        const {
            touched,
            failed,
            globalError
        } = this.state;

        return (<Popup title={title}
                       size={size}
                       errorHandler={false}
                       error={globalError}
                       onOpen={this.open.bind(this)}
                       submitButtonTitle="Save"
                       submitButtonDisabled={!touched || failed}
                       open={open}
                       onClose={onClose}
                       onHandle={this.handle.bind(this)}>
                {this.createForm()}
            <Box m={2} />
        </Popup>);
    }

    private createForm(): ReactElement {
        const {
            controls,
            fresh,
            layout
        } = this.props;

        const {
            errors
        } = this.state;

        const props = {
            controls,
            layout,
            fresh,
            onValidate: this.props.onValidate,
            errors,
            onReady: this.ready.bind(this),
            onTouch: this.touch.bind(this),
            onError: this.fail.bind(this)
        }

        if (this.props.form) {
            return this.props.form(props);
        }

        return (<DataForm { ...props} />);
    }

    open() {
        const { onOpen } = this.props;

        this.setState({
            errors: undefined,
            touched: false,
            failed: false,
            globalError: undefined
        });

        if (onOpen) {
            onOpen();
        }
    }

    handle(): Observable<boolean|undefined> {
        this.setState({ globalError: undefined });

        return singleton((done, reject) => {
            let submission = this.provider ? this.provider() : null;

            if (submission !== null) {
                this.props.onSubmit(submission).subscribe({
                    next: () => done(),
                    error: error => {
                        if (typeof error === 'object') {
                            this.setState({
                                errors: error
                            });
                            done(true);
                        } else  if (typeof error === 'string') {
                            this.setState({
                                globalError: error
                            });
                            done(true);
                        } else {
                            this.setState({
                                globalError: 'Unknown error'
                            });
                            console.log(error);
                            done(true);
                        }
                    }
                });
            } else {
                done(true);
            }
        });
    }

    ready(provider: DataFormResultProvider) {
        this.provider = provider;
    }

    touch() {
        this.setState({
            touched: true,
            globalError: undefined
        });

        const toucher = this.props.onTouch;

        if (toucher) {
            toucher();
        }
    }

    fail(failed: boolean) {
        this.setState({
            failed
        });
    }
}

export default PopupForm;