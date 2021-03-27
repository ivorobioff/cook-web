import { createStyles, Theme, withStyles } from '@material-ui/core';
import React, { Component } from 'react';

export interface CellNoteProps {
    content: string;
    classes: {[name: string]: string};
}

export interface CellNoteState {

}

const styles = (theme: Theme) => createStyles({
    content: {
        maxWidth: 300,
        whiteSpace: 'pre-line'
    }
});

class NoteCell extends Component<CellNoteProps, CellNoteState> {
    render() {

        const {
            classes
        } = this.props;

        return (<div className={classes.content}>
        { this.props.content }
        </div>);
    }
}

export default withStyles(styles)(NoteCell);