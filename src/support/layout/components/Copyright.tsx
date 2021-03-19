import React, { Component } from 'react';
import { Typography, Link } from '@material-ui/core';

export interface CopyrightProps {
    name: string;
    url: string;
}

class Copyright extends Component<CopyrightProps, {}> {
    
    render() {

        const { url, name } = this.props;

        return (<Typography variant="body2" color="textSecondary" align="center">
            {'Copyright © '}
            <Link color="inherit" href={url}>{name}</Link>{' '}
        {new Date().getFullYear()}
        {'.'}
      </Typography>);
    }
}

export default Copyright;