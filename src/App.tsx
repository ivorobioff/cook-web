import React, { Component } from 'react';
import {Route, Router, Switch } from 'react-router-dom';
import AppLayout from './app/components/layout/AppLayout';
import Container from './support/ioc/Container';
import { Authenticator } from './support/auth/Authenticator';
import HttpCommunicator from './support/http/HttpCommunicator';
import secretHeaderProvider from './support/auth/secretHeaderProvider';
import forbiddenErrorHandler from './support/auth/forbiddenErrorHandler';
import Environment from './support/env/Environment';
import { createMuiTheme, ThemeProvider } from '@material-ui/core';
import { cloneWith } from './support/random/utils';
import { createBrowserHistory } from 'history';
import AuthLayout from './support/auth/components/AuthLayout';
import Login  from './support/auth/components/Login';
import PrivateRoute from './support/auth/components/PrivateRoute';
import IngredientService from './app/services/IngredientService';
import IngredientView from './app/components/page/IngredientView';
import DishView from './app/components/page/DishView';
import ScheduleView from './app/components/page/ScheduleView';

const container = new Container();

const site = {
    name: 'Cook',
    url: 'http://cook.familythings.cloud'
};

container.registerFactory('env', () => {
    return cloneWith({
        site,
        apiBaseUrl: 'http://localhost:8080/api/v1.0',
    }, window.__ENV__);
});

container.registerType(IngredientService);
container.registerType(Authenticator);

container.registerFactory('history', () => createBrowserHistory());

// normal
container.registerFactory('http', container => {
    return new HttpCommunicator({ baseUrl: container.get<Environment>('env').apiBaseUrl })
});

// secured
container.registerFactory('https', container => {
    return new HttpCommunicator({
        baseUrl: container.get<Environment>('env').apiBaseUrl,
        requestOptionsProvider: secretHeaderProvider(container.get(Authenticator)),
        errorHandler: forbiddenErrorHandler(container.get(Authenticator))
    })
});

container.get(Authenticator).watch();

const theme = createMuiTheme({
    palette: {
        primary: {
            main: '#689f38',
            light: '#99d066',
            dark: '#387002',
            contrastText: '#ffffff'
        },
        secondary: {
            main: '#00acc1',
            light: '#5ddef4',
            dark: '#007c91',
            contrastText: '#ffffff'
        },
    }
});

interface AppProps {

}

interface AppState {

}

class App extends Component<AppProps, AppState> {
    render() {
        return (<ThemeProvider theme={theme}><Router history={container.get('history')}>
            <Switch>
                <PrivateRoute container={container} exact path={['/', '/schedules']}>
                    <AppLayout container={container}>
                        <ScheduleView container={container} />
                    </AppLayout>
                </PrivateRoute>
                <PrivateRoute container={container} exact path={['/dishes']}>
                    <AppLayout container={container}>
                        <DishView container={container} />
                    </AppLayout>
                </PrivateRoute>
                <PrivateRoute container={container} exact path={['/ingredients']}>
                    <AppLayout container={container}>
                        <IngredientView container={container} />
                    </AppLayout>
                </PrivateRoute>
                <Route exact path="/sign-in">
                    <AuthLayout title="Sign-In" site={site}>
                        <Login container={container} labels={ { usernameControl: 'Username'} } />
                    </AuthLayout>
                </Route>
            </Switch>
        </Router></ThemeProvider>)
    }
}

export default App;
