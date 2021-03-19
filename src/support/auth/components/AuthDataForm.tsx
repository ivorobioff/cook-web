import React, { Component } from 'react';
import {createStyles, Theme, withStyles} from "@material-ui/core";
import DataFormHandler, { DataFormTriggerOptions } from '../../form/components/DataFormHandler';
import { DataFormControl, DataFormResult, DataFormErrors } from '../../form/components/DataForm';
import { Observable } from 'rxjs';

const styles = (theme: Theme) => createStyles({
    form: {
        width: '100%', // Fix IE 11 issue.
        marginTop: theme.spacing(1),
    },
    submit: {
        margin: theme.spacing(3, 0, 2),
    }
});

export interface AuthDataFormProps {
    classes: {[name: string]: string};
    controls: DataFormControl[];
    submitTitle: string;
    onSubmit: (submission: DataFormResult) => Observable<any>;
    onValidate?: (submission: DataFormResult) => DataFormErrors;
    success?: string;
}

interface AuthDataFormState {

}

class AuthDataForm extends Component<AuthDataFormProps, AuthDataFormState> {

    private trigger: DataFormTriggerOptions;

    constructor(props: AuthDataFormProps) {
        super(props);

        const { classes, submitTitle } = this.props;

        this.trigger = {
            title: submitTitle,
            position: 'before',
            fullWidth: true,
            size: 'large',
            className: classes.submit,
            defaultAlignment: false
        };
    }

    render() {

        const { classes, children, onSubmit, controls, onValidate, success } = this.props;

        return  (<DataFormHandler 
                    success={success}
                    controls={controls} 
                    onValidate={onValidate}
                    onSubmit={onSubmit}
                    autoComplete="on" 
                    trigger={this.trigger}
                    className={classes.form}>
                    { children }
                </DataFormHandler>);
    }
}

export default withStyles(styles)(AuthDataForm);