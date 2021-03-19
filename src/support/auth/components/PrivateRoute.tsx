import React, { Component } from 'react';
import Container from '../../ioc/Container';
import { Authenticator } from '../Authenticator';
import { Route, Redirect } from 'react-router-dom';

export interface PrivateRouteProps {
    path: string | string[];
    exact?: boolean;
    container: Container;
}

export default class PrivateRoute extends Component<PrivateRouteProps, {}> {

    private authenticator: Authenticator;

    constructor(props: PrivateRouteProps) {
        super(props);

        this.authenticator = props.container.get(Authenticator);
    }

    render() {
        let session = this.authenticator.session;
        const { exact, path, children } = this.props;

        return (<Route exact={exact} path={path}>
            { session ? children : (<Redirect to="/sign-in" />)}
        </Route>);
    }
}