import { createStyles, Theme, withStyles } from '@material-ui/core';
import React, { Component, Fragment, ReactElement } from 'react';
import Popup from '../../../support/modal/components/Popup';
import { cloneWith } from '../../../support/random/utils';

export interface NoteCellProps {
    content: string;
    classes: {[name: string]: string};
}

export interface NoteCellState {
    inFull?: {
        open: boolean;
    }
}

const styles = (theme: Theme) => createStyles({
    shortContent: {
        maxWidth: 300,
        whiteSpace: 'pre-line'
    },
    fullContent: {
        whiteSpace: 'pre-line'
    },
    readMore: {
        borderBottomStyle: 'dotted',
        borderBottomWidth: 'thin',
        cursor: 'pointer',
        color: theme.palette.secondary.dark
    }
});

const contentLimit = 200;

class NoteCell extends Component<NoteCellProps, NoteCellState> {

    constructor(props: NoteCellProps) {
        super(props);

        this.state = {};
    }

    render() {

        const {
            classes
        } = this.props;

        const content = this.props.content || '';
        const tooLong = content.length > contentLimit;
        const adjustedContent = tooLong ? content.substr(0, contentLimit) + '...' : content;

        return (<Fragment>

            <div className={classes.shortContent}>
                { adjustedContent } { tooLong && <span className={classes.readMore} onClick={this.showInFull.bind(this)}>read more</span>}
            </div>

            {this.state.inFull && (<Popup
                size="md"
                onClose={this.closeInFull.bind(this)}
                open={this.state.inFull!.open}
                submitButtonTitle="OK"
                title="Notes">
                     <div className={classes.fullContent}>{content}</div>
            </Popup>)}
            
        </Fragment>);
    }

    showInFull() {
        this.setState({
            inFull: cloneWith(this.state.inFull, {
                open: true
            })
        });
    }
    
    closeInFull() {
        this.setState({
            inFull: cloneWith(this.state.inFull, {
                open: false
            })
        });
    }
}

export default withStyles(styles)(NoteCell);