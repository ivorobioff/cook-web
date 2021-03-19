import React, { Component } from 'react';
import {createStyles, Paper, Theme, withStyles} from "@material-ui/core";

const styles = (theme: Theme) => createStyles({
    root: {
        padding: theme.spacing(2)
    }
});

export interface DataPaperProps {
    classes: {[name: string]: string};
}

export interface DataPaperState {

}

class DataPaper extends Component<DataPaperProps, DataPaperState> {

    render() {
        const { children, classes } = this.props;

        return (<Paper className={classes.root}>{children}</Paper>);
    }
}

export default withStyles(styles)(DataPaper);

