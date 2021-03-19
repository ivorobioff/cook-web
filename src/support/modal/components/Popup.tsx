import React, { Component } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, Theme, createStyles, withStyles } from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import Alert from "@material-ui/lab/Alert";
import Trigger from "../../random/components/Trigger";
import {Observable} from "rxjs";
import { singleton } from '../../mapping/operators';

const styles = (theme: Theme) => createStyles({
    closeButton: {
        position: 'absolute',
        right: theme.spacing(1),
        top: theme.spacing(1)
    },
    alert: {
        marginBottom: theme.spacing(2)
    }
});

export interface PopupProps {
    onClose: () => void;
    onOpen?: () => void;
    onHandle?: () => Observable<boolean|undefined>,
    open: boolean;
    title: string;
    submitButtonTitle?: string;
    cancelButtonTitle?: string;
    classes: {[name: string]: string};
    submitButtonDisabled?: boolean;
    errorHandler?: boolean;
    error?: string;
}

interface PopupState {
    error?: string;
    success?: string;
}

class Popup extends Component<PopupProps, PopupState> {

    constructor(props: PopupProps) {
        super(props);

        this.state = {};
    }

    render() {

        const {
            open,
            children,
            title,
            classes,
            submitButtonTitle = 'Submit',
            cancelButtonTitle,
            submitButtonDisabled = false
        } = this.props;

        const {
            error
        } = this.state;

        return (<Dialog open={open} onEnter={this.beforeOpen.bind(this)} onClose={this.cancel.bind(this)} fullWidth maxWidth="xs">
        <DialogTitle>{title}
            <IconButton aria-label="close" onClick={this.cancel.bind(this)} className={classes.closeButton}>
                <CloseIcon />
            </IconButton>
        </DialogTitle>
        <DialogContent dividers>
            {error && (<Alert className={classes.alert} severity="error">{error}</Alert>)}
            { children }
        </DialogContent>
        <DialogActions>
            {cancelButtonTitle &&
                (<Button onClick={this.cancel.bind(this)} color="secondary">
                    {cancelButtonTitle}
                </Button>)}
            <Trigger disabled={submitButtonDisabled} onHandle={this.submit.bind(this)} color="primary">
                {submitButtonTitle}
            </Trigger>
        </DialogActions>
    </Dialog>);
    }

    beforeOpen() {
        this.resetError();

        if (this.props.onOpen) {
            this.props.onOpen();
        }
    }

    componentDidUpdate(prevProps: PopupProps): void {
        if (this.props.error !== prevProps.error && !this.useErrorHandler()) {
            if (this.props.error) {
                this.assignError(this.props.error);
            } else {
                this.resetError();
            }
        }
    }

    cancel() {
        this.props.onClose();
    }

    submit() {
        return singleton((done, reject) => {
            if (this.props.onHandle) {
                if (this.useErrorHandler()) {
                    this.resetError();
                }
                this.props.onHandle().subscribe({
                    next: keep =>  {
                        if (!keep) {
                            this.props.onClose();
                        }

                        done();
                    },
                    error: error => {
                        if (this.useErrorHandler()) {
                            if (typeof error === 'string') {
                                this.assignError(error);
                                done();
                            } else {
                                this.assignError('Unknown error');
                                console.log(error);
                                done();
                            }
                        } else {
                            reject(error);
                        }
                    }
                });
            } else {
                this.props.onClose();
                done();
            }
        });
    }

    private useErrorHandler(): boolean {
        let handler = this.props.errorHandler;

        if (typeof handler === 'boolean') {
            return handler;
        }

        return true;
    }

    private assignError(error: string) {
        this.setState({
            error
        });
    }

    private resetError() {
        this.setState({
            error: undefined
        })
    }
}

export default withStyles(styles)(Popup);