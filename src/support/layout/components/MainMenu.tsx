import React, { Component, ReactElement } from 'react';
import { List, ListItem, ListItemIcon, ListItemText } from '@material-ui/core';
import { Link } from 'react-router-dom';

export interface MainMenuItem {
    title: string;
    icon: ReactElement;
    path: string;
}

interface MainMenuState {

}

export interface MainMenuProps {
    items: MainMenuItem[];
}

class MainMenu extends Component<MainMenuProps, MainMenuState> {

    constructor(props: MainMenuProps) {
        super(props);

        this.state = {};
    }

    render() {

        const { items } = this.props;

        return (<List>
            {items.map((item, i) => {
                return (<ListItem key={`i-${i}`} button component={Link} to={item.path}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.title} />
            </ListItem>);
            })}
        </List>);
    }
}

export default MainMenu;