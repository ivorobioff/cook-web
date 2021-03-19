import React, { Component, Fragment } from 'react';
import {Button, CircularProgress, createStyles, PropTypes, Theme, withStyles} from "@material-ui/core";
import {ucFirst} from "../utils";
import clsx from "clsx";
import {Observable} from "rxjs";
import { finalize } from 'rxjs/operators';

const loadingSizes = {
    small: 20,
    medium: 22,
    large: 24
};

const styles = (theme: Theme) => createStyles({
    loadingIcon: {
        position: 'absolute',
        left: '50%',
        top: '50%'
    },

    loadingIconSmall: {
        marginLeft: Math.ceil(loadingSizes['small'] / 2) * -1,
        marginTop: Math.ceil(loadingSizes['small'] / 2) * -1,
    },

    loadingIconMedium: {
        marginLeft: Math.ceil(loadingSizes['medium'] / 2) * -1,
        marginTop: Math.ceil(loadingSizes['medium'] / 2) * -1,
    },

    loadingIconLarge: {
        marginLeft: Math.ceil(loadingSizes['large'] / 2) * -1,
        marginTop: Math.ceil(loadingSizes['large'] / 2) * -1,
    },

    triggerButton: {
        position: 'relative'
    }
});


export interface TriggerProps {
    classes: {[name: string]: string};
    onHandle: () => Observable<any>;
    color?: PropTypes.Color;
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
    fullWidth?: boolean;
    variant?: 'text' | 'outlined' | 'contained';
    className?: string;
}

interface TriggerState {
    loading: boolean
}

class Trigger extends Component<TriggerProps, TriggerState> {

    constructor(props: TriggerProps) {
        super(props);

        this.state = { loading: false };
    }

    render() {

        const {
            classes,
            color = 'default',
            size = 'medium',
            children,
            fullWidth,
            variant = 'text',
            className = ''
        } = this.props;

        const { loading } = this.state;

        return (<Fragment>
            <Button className={`${classes.triggerButton} ${className}`}
                    fullWidth={fullWidth}
                    disabled={loading || this.props.disabled} size={size}
                    onClick={this.click.bind(this)}
                    variant={variant}
                    color={color}>
                {(loading && <CircularProgress size={loadingSizes[size]}
                    className={clsx(classes.loadingIcon, classes[`loadingIcon${ucFirst(size)}`])} />)} {children}
            </Button>
        </Fragment>);
    }

    click() {
        this.start();
        this.props.onHandle().pipe(
            finalize(() => this.stop())
        ).subscribe(() => {
            //
        }, console.error);
    }

    private start() {
        this.setState({ loading: true });
    }

    private stop() {
        this.setState({ loading: false });
    }
}

export default withStyles(styles)(Trigger);
