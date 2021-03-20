import React, { Component } from 'react';
import Popup from "./Popup";
import DataForm, {DataFormControl, DataFormErrors, DataFormLayoutProvider, DataFormResult, DataFormResultProvider, DataFormTouchHandler} from "../../form/components/DataForm";
import {Box} from "@material-ui/core";
import {Observable} from "rxjs";
import { singleton } from '../../mapping/operators';

export type PopupFormSubmitHandler = (data: DataFormResult) => Observable<any>;

export interface PopupFormProps {
    open: boolean;
    onSubmit: PopupFormSubmitHandler;
    onClose: () => void;
    onOpen?: () => void;
    title: string;
    controls: DataFormControl[];
    onValidate?: (result: DataFormResult) => DataFormErrors;
    fresh?: boolean;
    onTouch?: DataFormTouchHandler;
    layout?: DataFormLayoutProvider;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
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

    render() {

        const {
            open,
            title,
            onClose,
            controls,
            fresh,
            layout,
            size
        } = this.props;

        const {
            errors,
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
                <DataForm controls={controls}
                        layout={layout}
                        fresh={fresh}
                        onValidate={this.props.onValidate}
                        errors={errors}
                        onReady={this.ready.bind(this)}
                        onTouch={this.touch.bind(this)}
                        onError={this.fail.bind(this)} />

            <Box m={2} />
        </Popup>);
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