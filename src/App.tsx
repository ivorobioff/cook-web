import React, { Component } from 'react';
import {Route, Router, Switch } from 'react-router-dom';
import AppLayout from './app/components/layout/AppLayout';
import { createMuiTheme, ThemeProvider } from '@material-ui/core';
import { createBrowserHistory } from 'history';
import DishView from './app/components/page/DishView';
import ScheduleView from './app/components/page/ScheduleView';
import DishService from './app/services/DishService';
import ScheduleService from './app/services/ScheduleService';
import HistoryService from './app/services/HistoryService';
import { Authenticator, AuthLayout, cloneWith, Container, Environment, forbiddenErrorHandler, HttpCommunicator, Login, PrivateRoute, secretHeaderProvider }  from '@ivorobioff/techmoodivns-support';

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

container.registerType(DishService);
container.registerType(ScheduleService);
container.registerType(HistoryService);
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
