import React, { Component } from 'react';
import {createStyles, Theme, withStyles} from "@material-ui/core";
import Container from '@material-ui/core/Container';
import CssBaseline from '@material-ui/core/CssBaseline';
import Avatar from '@material-ui/core/Avatar';
import Typography from '@material-ui/core/Typography';
import LockOutlinedIcon from '@material-ui/icons/LockOutlined';
import Box from '@material-ui/core/Box';
import Copyright from '../../layout/components/Copyright';

const styles = (theme: Theme) => createStyles({
    paper: {
        marginTop: theme.spacing(8),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    avatar: {
        margin: theme.spacing(1),
        backgroundColor: theme.palette.secondary.main,
    }
});

export interface AuthLayoutProps {
    title: string;
    classes: {[name: string]: string};
    site: {
        url: string;
        name: string;
    }
}

class AuthLayout extends Component<AuthLayoutProps, {}> {

    render() {

        const { title, classes, children } = this.props;

    return (<Container component="main" maxWidth="xs">
        <CssBaseline />
        <div className={classes.paper}>
            <Avatar className={classes.avatar}>
                <LockOutlinedIcon />
            </Avatar>
            <Typography component="h1" variant="h5">
                {title}
            </Typography>
            <Box mb={2}/>
            {children}
        </div>
        <Box mt={8}>
            <Copyright url={this.props.site.url} name={this.props.site.name}  />
        </Box>
    </Container>);
    }
}

export default withStyles(styles)(AuthLayout);