import React, { Component } from 'react';

export interface CellNoteProps {
    content: string;
}

export interface CellNoteState {

}

class CellNote extends Component<CellNoteProps, CellNoteState> {
    render() {
        return (<div style={{ maxWidth: '300px', whiteSpace: 'pre-line' }}>
        { this.props.content }
        </div>);
    }
}

export default CellNote;