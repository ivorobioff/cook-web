import React, { Component, MouseEvent } from 'react';
import { Button, Typography, createStyles, Theme, withStyles, Menu, MenuItem, Divider } from '@material-ui/core';
import AccountCircle from '@material-ui/icons/AccountCircle';

const styles = (theme: Theme) => createStyles({
    title: {
        marginRight: theme.spacing(1)
    },
    menuItem: {
        minWidth: 150
    }
})

export interface UserMenuItem {
    title: string;
    onClick: () => void;
}

export type UserMenuItemGroup = UserMenuItem[];
export type UserMenuClickHandler = (event: MouseEvent<HTMLElement>) => void;

export interface UserMenuProps {
    title: string;
    onClick?: UserMenuClickHandler;
    items?: UserMenuItemGroup[];
    classes: {[name: string]: string};
}

interface UserMenuState {
    anchor: HTMLElement | null;
}

class UserMenu extends Component<UserMenuProps, UserMenuState> {

    constructor(props: UserMenuProps) {
        super(props);

        this.state = {
            anchor: null
        };
    }
    
    render() {

        const { title, items = [], classes } = this.props;
        const  { anchor } = this.state;

        return (<div>
            <Button
                aria-label={title}
                aria-controls="user-menu"
                aria-haspopup="true"
                onClick={this.open.bind(this)}
                color="inherit">
                    <Typography className={classes.title} variant="button">{ title }</Typography>
                    <AccountCircle />
                </Button>

                <Menu
                    id="user-menu"
                    anchorEl={anchor}
                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                    keepMounted
                    open={!!anchor}
                    onClose={this.close.bind(this)}>
                        { items.map((group, gi) => {
                            let section = group.map((item, ii) => {
                                return (<MenuItem className={classes.menuItem} key={`${gi}-${ii}`} onClick={this.handle.bind(this, item)}>{item.title}</MenuItem>)
                            });

                            if (gi < items.length - 1) {
                                section.push(<Divider />);
                            }

                            return section;
                        }) }
              </Menu>
        </div>)
    }

    open(event: MouseEvent<HTMLElement>) {

        const { items, onClick } = this.props;

        if (items) {
            this.setState({ anchor: event.currentTarget });
        } else if (onClick) {
            onClick(event);
        }
    }
    
    handle(item: UserMenuItem) {
        this.close();
        item.onClick();
    }

    close() {
        this.setState({ anchor: null });
    }
}

export default withStyles(styles)(UserMenu);