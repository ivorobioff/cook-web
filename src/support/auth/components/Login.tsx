import React, { Component, Fragment } from 'react';
import {Authenticator} from "../Authenticator";
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { peek } from '../../mapping/operators';
import Container from '../../ioc/Container';
import AuthDataForm from './AuthDataForm';
import { DataFormControl, DataFormResult } from '../../form/components/DataForm';
import LinkArea, { AuthLink } from './LinkArea';
import Alert from '@material-ui/lab/Alert';
import { createStyles, Theme, withStyles } from '@material-ui/core';

const styles = (theme: Theme) => createStyles({
    alert: {
        width: '100%',
        marginBottom: theme.spacing(2)
    }
});

export interface LoginLocationState {
    flash?: string;
}

export interface LoginRoutes {
    afterSingIn?: string;
    signUp?: string;
    forgotPassword?: string;
}

export interface LoginProps extends RouteComponentProps {
    classes: {[name: string]: string};
    container: Container;
    routes?: LoginRoutes;
    labels?: {
        usernameControl?: string
    }
}

interface LoginState {
    flash?: string;
}

class Login extends Component<LoginProps, LoginState> {

    private authenticator: Authenticator;

    private controls: DataFormControl[] = [{
        type: 'text',
        label: this.props.labels?.usernameControl || 'E-mail',
        required: true,
        name: 'username',
        extra: {
            variant: 'outlined'
        }
    },{
        type: 'text',
        label: 'Password',
        required: true,
        name: 'password',
        extra: {
            type: 'password',
            variant: 'outlined'
        }
    },{
        type: 'checkbox',
        label: 'Remember',
        name: 'remember',
    }];

    constructor(props: LoginProps) {
        super(props);

        const { container } = this.props;

        this.authenticator = container.get(Authenticator);

        this.state = {};
    }

    componentDidMount() {
        let state: LoginLocationState = (this.props.location.state || {});

        if (state.flash) {
            this.setState({ flash: state.flash });
        }
    }

    render() {

        const { routes = {}, classes } = this.props;
        const { flash } = this.state;

        const links: AuthLink[] = [];

        if (routes.forgotPassword) {
            links.push({
                route: routes.forgotPassword,
                title: 'Forgot password?'
            })
        }

        if (routes.signUp) {
            links.push({
                route: routes.signUp,
                title: `Don't have an account? Sign Up`
            })
        }

        return  (<Fragment>
            { flash && (<Alert className={classes.alert}>{flash}</Alert>)}
            <AuthDataForm 
                    controls={this.controls} 
                    onSubmit={this.submit.bind(this)}
                    submitTitle="Sing In">
                        <LinkArea links={links} />
                </AuthDataForm>
        </Fragment>);
    }

    submit(submission: DataFormResult) {

        let {
            username,
            password,
            remember
        } = submission;

        const { afterSingIn = '/' } = this.props.routes || {};

        return this.authenticator.login(username, password, remember).pipe(
            peek(() => this.props.history.replace(afterSingIn), 'after')
        );
    }
}

export default withStyles(styles)(withRouter(Login));