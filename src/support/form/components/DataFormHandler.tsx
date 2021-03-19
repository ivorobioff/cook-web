import React, { Component, Fragment, ReactElement } from 'react';
import DataForm, { DataFormControl, DataFormErrors, DataFormResult, DataFormResultProvider, DataFormValidateHandler } from './DataForm';
import { Observable } from 'rxjs';
import { singleton } from '../../mapping/operators';
import { Theme, createStyles, withStyles, PropTypes, Box } from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import Trigger from '../../random/components/Trigger';
import { cloneWith } from '../../random/utils';

const styles = (theme: Theme) => createStyles({
    alert: {
        width: '100%',
        marginBottom: theme.spacing(2)
    }
});

export interface DataFormTriggerOptions {
    title?: string;
    className?: string;
    fullWidth?: boolean;
    size?: 'small' | 'medium' | 'large';
    variant?: 'outlined' | 'contained' | 'text';
    color?: PropTypes.Color;
    position?: 'before' | 'after';
    wrapperStyle?: {[name: string]: string|number};
    defaultAlignment?: boolean;
}


export interface DataFormHandlerProps {
    controls: DataFormControl[];
    onSubmit: (submission: DataFormResult) => Observable<any>;
    onValidate?: DataFormValidateHandler;
    classes: {[name: string]: string};
    autoComplete?: 'on' | 'off';
    className?: string;
    success?: string;
    trigger?: DataFormTriggerOptions;
}

interface DataFormHandlerState {
    touched: boolean;
    failed: boolean;
    errors: DataFormErrors;
    success?: string;
    globalError?: string;
    fresh: boolean;
}

class DataFormHandler extends Component<DataFormHandlerProps, DataFormHandlerState> {
    
    private provider?: DataFormResultProvider;

    constructor(props: DataFormHandlerProps) {
        super(props);

        this.state = {
            touched: false,
            failed: false,
            fresh: true,
            errors: {}
        }
    }
    
    render() {
        const { children, controls, classes, autoComplete, trigger = {}, className, onValidate } = this.props;
        const { globalError, errors, success, fresh } = this.state;
        
        const triggerPosition = trigger.position || 'after';

        return (<Fragment>
            { success && (<Alert className={classes.alert} onClose={this.closeSuccess.bind(this)}>{success}</Alert>)}
            { globalError && (<Alert className={classes.alert} severity="error">{globalError}</Alert>) }
            <DataForm 
                fresh={fresh}
                className={className}
                autoComplete={autoComplete} 
                onValidate={onValidate}
                controls={controls}
                onError={this.fail.bind(this)}
                onReady={this.ready.bind(this)}
                onTouch={this.touch.bind(this)}
                errors={errors}>
                    { triggerPosition ===  'before' ? this.renderTrigger() : undefined }
                    {children}
                    { triggerPosition ===  'after' ? this.renderTrigger() : undefined }
                </DataForm>
        </Fragment>);
    }

    private closeSuccess() {
        this.setState({ success: undefined });
    }

    private renderTrigger(): ReactElement {

        const { trigger = {} } = this.props;
        const { touched, failed } = this.state;

        const { defaultAlignment = true } = trigger;
        
        const wrapperStyle = cloneWith(defaultAlignment 
            ? { mt: 2, textAlign: 'right' } 
            : {}, trigger.wrapperStyle || {})

        return (<Box { ...wrapperStyle }><Trigger
            disabled={!touched || failed}
            onHandle={this.submit.bind(this)}
            fullWidth={trigger.fullWidth}
            size={trigger.size || 'medium'}
            variant={trigger.variant || 'contained'}
            color={trigger.color || 'primary'}
            className={trigger.className}>
            {trigger.title || 'Save'}
        </Trigger></Box>)
    }

    ready(provider: DataFormResultProvider) {
        this.provider = provider;
    }

    touch() {
        this.setState({
            touched: true,
            fresh: false,
            success: undefined
        });
    }

    fail(failed: boolean) {
        this.setState({
            failed
        })
    }

    submit() {
        this.setState({
            globalError: undefined,
            success: undefined
        });
        
        let { onSubmit, success } = this.props;

        return singleton((done, reject) => {
            let submission = (this.provider as DataFormResultProvider)();

            if (submission !== null) {
                onSubmit(submission)
                    .subscribe(() => {
                        this.setState({
                            touched: false,
                            success,
                            fresh: true
                        });
                        done();
                    }, error => {
                        if (typeof error === 'object') {
                            this.setState({ errors: error });
                            done();
                        } else if (typeof error === 'string') {
                            this.setState({ globalError: error });
                            done();
                        } else {
                            this.setState({ globalError: 'Unknown error' });
                            reject(error);
                        }
                    })
            } else {
                done();
            }
        });
    }
}

export default withStyles(styles)(DataFormHandler);