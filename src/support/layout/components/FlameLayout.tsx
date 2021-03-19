import React, { Component } from 'react';
import { AppBar, CssBaseline, Theme, withStyles, createStyles, Toolbar, IconButton, Typography, Drawer, Divider, Container, Box } from '@material-ui/core';
import clsx from 'clsx';
import MenuIcon from '@material-ui/icons/Menu';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import MainMenu, { MainMenuItem } from './MainMenu';
import Copyright from './Copyright';
import UserMenu, { UserMenuItemGroup } from './UserMenu';

const drawerWidth = 230;

const styles = (theme: Theme) => createStyles({
    root: {
        display: 'flex'
    },
    toolbar: {
        paddingRight: 24
    },
    toolbarIcon: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '0 8px 0 17px',
        ...theme.mixins.toolbar,
    },
    appBar: {
        zIndex: theme.zIndex.drawer + 1,
        transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
    }, appBarShift: {
        marginLeft: drawerWidth,
        width: `calc(100% - ${drawerWidth}px)`,
        transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
    },
    menuButton: {
        marginRight: 36,
    },
    menuButtonHidden: {
        display: 'none',
    },
    title: {
        flexGrow: 1,
    },
    drawerPaper: {
        position: 'relative',
        whiteSpace: 'nowrap',
        width: drawerWidth,
        transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
    },
    drawerPaperClose: {
        overflowX: 'hidden',
        transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
        width: theme.spacing(7),
        [theme.breakpoints.up('sm')]: {
            width: theme.spacing(9),
        },
    },
    appBarSpacer: theme.mixins.toolbar,
    content: {
        flexGrow: 1,
        height: '100vh',
        overflow: 'auto',
    },
    container: {
        paddingTop: theme.spacing(4),
        paddingBottom: theme.spacing(4),
    }
});

export interface UserMenuOptions {
    title: string;
    items?: UserMenuItemGroup[];
}

interface FlameLayoutProps {
    classes: { [name: string]: string };

    site: {
        url: string;
        name: string;
    },

    title: string;

    mainMenu: {
        items: MainMenuItem[]
    };

    userMenu: UserMenuOptions
}

interface FlameLayoutState {
    expanded: boolean;
}

class FlameLayout extends Component<FlameLayoutProps, FlameLayoutState> {

    constructor(props: FlameLayoutProps) {
        super(props);

        this.state = {
            expanded: false
        };
    }
    
    showMenu() {
        this.setState({
            expanded: true
        });
    }

    hideMenu() {
        this.setState({
            expanded: false
        });
    }    

    render() {

        const { classes, site, title, mainMenu, userMenu } = this.props;
        const { expanded } = this.state;

        return (<div className={classes.root}>
            <CssBaseline />
            <AppBar position="absolute" className={clsx(classes.appBar, expanded && classes.appBarShift)}>
                <Toolbar className={classes.toolbar}>
                    <IconButton
                        edge="start"
                        color="inherit"
                        aria-label="open drawer"
                        onClick={ this.showMenu.bind(this) }
                        className={clsx(classes.menuButton, expanded && classes.menuButtonHidden)}>
                        <MenuIcon />
                    </IconButton>
                    <Typography 
                        component="h1" 
                        variant="h6" 
                        color="inherit" 
                        noWrap
                        className={classes.title}>
                        {expanded ?  '' : title}
                    </Typography>
                    <UserMenu title={userMenu.title} items={userMenu.items} />
                </Toolbar>
            </AppBar>
            <Drawer 
                variant="permanent"
                classes={{
                    paper: clsx(classes.drawerPaper, !expanded && classes.drawerPaperClose),
                }}
                open={expanded}>
                    
                <div className={classes.toolbarIcon}>
                    <Typography 
                        component="h1" 
                        variant="h6" 
                        color="inherit" 
                        noWrap 
                        className={classes.title}>
                        {title}
                    </Typography>
                    <IconButton onClick={this.hideMenu.bind(this)}>
                        <ChevronLeftIcon />
                    </IconButton>
                </div>
                <Divider />
                <MainMenu items={mainMenu.items} />
            </Drawer>
            <main className={classes.content}>
                <div className={classes.appBarSpacer} />
                <Container className={classes.container}>
                    { this.props.children }
                    <Box pt={4}>
                        <Copyright url={site.url} name={site.name} />
                    </Box>
                </Container>
            </main>
        </div>);
    }
}

export default withStyles(styles)(FlameLayout);