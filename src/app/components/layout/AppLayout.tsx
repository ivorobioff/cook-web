import React, { Component } from 'react';
import RestaurantIcon from '@material-ui/icons/Restaurant';
import ScheduleIcon from '@material-ui/icons/Schedule';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { Authenticator, cloneWith, Container, Environment, FlameLayout, UserMenuOptions }  from '@ivorobioff/techmoodivns-support';

const mainMenu = {
    items: [{
        title: 'Schedules',
        path: '/',
        icon: <ScheduleIcon />
    },
    {
        title: 'Dishes',
        path: '/dishes',
        icon: <RestaurantIcon />
    }]
}

export interface AppLayoutProps extends RouteComponentProps {
    container: Container;
}

interface AppLayoutState {
    userMenu: UserMenuOptions
}

class AppLayout extends Component<AppLayoutProps, AppLayoutState> {

    private authenticator: Authenticator;
    private env: Environment;

    constructor(props: AppLayoutProps) {
        super(props);

        let container  = props.container;
        
        this.authenticator = container.get(Authenticator);
        this.env = container.get('env') as Environment;

        this.state = {
            userMenu: { 
                title: 'Guest',
                items: [[{
                    title: 'Logout',
                    onClick: () => this.logout(),
                }]]
            }
        }
    }

    componentDidMount() {
        let title = this.authenticator.session?.actor.name;
        
        this.setState({
            userMenu: cloneWith(this.state.userMenu, { title })
        })
    }

    render() {
        const { children } = this.props;
        const { userMenu } = this.state;

        return (<FlameLayout 
            mainMenu={mainMenu} 
            site={this.env.site} 
            title={this.env.site.name} 
            userMenu={userMenu}>{children}</FlameLayout>);
    }

    logout() {
        this.authenticator.logout();
    }
}

export default withRouter(AppLayout);
