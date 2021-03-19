import React, { Component } from 'react';
import Link from '@material-ui/core/Link';
import { Link as RouteLink } from 'react-router-dom';
import { Box } from '@material-ui/core';

export interface AuthLink {
    route: string;
    title: string;
}

export interface LinkAreaProps {
    links?: AuthLink[];
}

class LinkArea extends Component<LinkAreaProps, {}> {

    render() {
        const { links = [] } = this.props;
        
        return (<Box pr={1} pl={1} display="flex" justifyContent={links.length > 1 ? 'space-between' : 'center'}>
            { links.map((link, i) => {
                return (<Link key={i} component={RouteLink} to={link.route} variant="body2">{link.title}</Link>)
            })}
    </Box>)
    }
}

export default LinkArea;