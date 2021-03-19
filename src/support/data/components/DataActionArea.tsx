import React, { Component } from 'react';
import {createStyles, Theme, withStyles} from "@material-ui/core";
import Button from "@material-ui/core/Button";

const styles = (them: Theme) => createStyles({
    root: {
        textAlign: 'right',
        marginTop: them.spacing(2)
    }
});

type DataActionCreateHandler = () => void;

interface DataActionAreaProps {
    classes: {[name: string]:string};
    onCreate: DataActionCreateHandler
}

interface DataActionAreaState {

}

class DataActionArea extends Component<DataActionAreaProps, DataActionAreaState> {

    render() {

        const {
            classes,
            onCreate
        } = this.props;

        return (<div className={classes.root}>
            <Button onClick={onCreate} variant="contained" color="primary">Create</Button>
        </div>)
    }
}

export default withStyles(styles)(DataActionArea)