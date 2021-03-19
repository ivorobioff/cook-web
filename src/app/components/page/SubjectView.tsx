import React, { Component, Fragment } from "react"
import { tap } from "rxjs/operators";
import DataActionArea from "../../../support/data/components/DataActionArea";
import DataPaper from "../../../support/data/components/DataPaper";
import DataView, { DataViewAction, DataViewCellTextColor, DataViewColumn, DataViewPaged } from "../../../support/data/components/DataView";
import { DataFormControl, DataFormResult } from "../../../support/form/components/DataForm";
import Container from "../../../support/ioc/Container"
import PopupForm from "../../../support/modal/components/PopupForm";
import { cloneArray, cloneArrayExcept, cloneArrayWith, cloneWith, fromAllCapsToHumanCase, transferTo } from "../../../support/random/utils";
import Subject, { SubjectToPersist } from "../../models/Subject";
import { SubjectService } from "../../services/SubjectService";
import moment from "moment";
import {AiFillDelete, AiOutlineEdit} from "react-icons/ai";
import Confirmation from "../../../support/modal/components/Confirmation";
import { FormControl, Grid, IconButton, Input, InputAdornment, Typography } from "@material-ui/core";
import SearchIcon from '@material-ui/icons/Search';
import { isBlank } from "../../../support/validation/utils";


interface SubjectProps {
    container: Container;
}

interface SubjectState {
    data: Subject[],
    edit?: {
        subject: Subject;
        open: boolean;
        controls: DataFormControl[];
    },
    create?: {
        open: boolean;
        controls: DataFormControl[];
    },
    remove?: {
        open: true,
        subject: Subject
    },
    term?: string,
    repaging: boolean,
    searched: boolean
}

const opinions = {
    EXCELLENT: 'Excellent',
    GOOD: 'Good',
    SO_SO: 'So-so',
    BAD: 'Bad'
}

const opinionColoring: {[type: string]: DataViewCellTextColor} = {
    EXCELLENT: 'success',
    GOOD: 'success',
    SO_SO: 'warning',
    BAD: 'error'
}

export default class SubjectView extends Component<SubjectProps, SubjectState> {

    private subjectService: SubjectService;

    columns: DataViewColumn[] = [
        {
            name: 'name'
        },
        {
            name: 'notes'
        },
        {
            name: 'opinion',
            color: (value, subject: Subject) => opinionColoring[subject.opinion],
            pipe: fromAllCapsToHumanCase
        },
        {
            name: 'createdAt',
            title: 'Create Date',
            pipe: v => moment(v).format('DD/MM/YYYY')
        }
    ];
    

    actions: DataViewAction[] = [{
        icon: <AiOutlineEdit />,
        onClick: subject => {
            this.setState({
                edit: {
                    open: true,
                    subject,
                    controls: this.defineEditorControls(subject)
                }
            });
        }
    }, {
        icon: <AiFillDelete />,
        onClick: subject => {
            this.setState({
                remove: {
                    open: true,
                    subject
                }
            });
        }
    }];
    
    private paged: DataViewPaged = {
        onChange: (offset, limit) => {
            this.subjectService.getAll(offset, limit, this.state.term).subscribe(data => {
                this.setState({ data, repaging: false, searched: !!this.state.term });
            }, error => {
                this.setState({ data: [], repaging: false, searched: !!this.state.term });
                console.error(error);
            });
        }
    };

    constructor(props: SubjectProps) {
        super(props);

        this.subjectService = props.container.get(SubjectService);

        this.state = {
            data: [],
            repaging: false,
            searched: false
        }
    }

    render() {

        const { data } = this.state;

        return (<Fragment>
            <DataPaper>
                <Grid container justify="space-between" style={{ marginBottom: 20}}>
                    <Grid item md={6}>
                        <Typography component="h2" variant="h6" color="primary">Subjects</Typography>
                    </Grid>
                    <Grid item md={6}>
                        <FormControl  fullWidth>
                            <Input placeholder="Search" onChange={ this.changeSearch.bind(this) } onKeyDown={ this.searchKeyDown.bind(this) } endAdornment={
                                <InputAdornment position="end">
                                    <IconButton onClick={this.searchSubjects.bind(this)} disabled={!this.canSearch()}>
                                    <SearchIcon />
                                    </IconButton>
                                </InputAdornment>
                            } />
                        </FormControl>
                    </Grid>
                </Grid>
                <DataView
                    data={data}
                    paged={this.paged}
                    repaging={this.state.repaging}
                    actions={this.actions}
                    columns={this.columns} />
                    <DataActionArea onCreate={this.openCreator.bind(this)} />
            </DataPaper>

            {this.state.remove && (<Confirmation
                onClose={this.closeRemoveConfirmation.bind(this)}
                onHandle={this.handleRemoveConfirmation.bind(this)}
                confirmButtonTitle="Proceed"
                open={this.state.remove!.open}
                title="Subject - Delete">
                {`You are about to delete "${this.state.remove!.subject.name}". Do you want to proceed?`}
            </Confirmation>)}

            {this.state.edit && (<PopupForm
                controls={this.state.edit!.controls}
                onClose={this.closeEditor.bind(this)}
                onSubmit={this.submitEditor.bind(this)}
                open={this.state.edit!.open}
                title="Subject - Update" />) }

            {this.state.create && (<PopupForm
                controls={this.state.create!.controls}
                onClose={this.closeCreator.bind(this)}
                onSubmit={this.submitCreator.bind(this)}
                open={this.state.create!.open}
                title="Subject - Create" />) }

        
        </Fragment>)
    }

    canSearch() {
        return this.state.searched === true || !isBlank(this.state.term);
    }

    changeSearch(e: any) {
        this.setState({
            term: e.target.value
        });
    }

    searchKeyDown(e: any)  {
        if (e.key === 'Enter') {
            this.searchSubjects();
        }
    }

    searchSubjects() {
        if (this.canSearch()) {
            this.setState({
                repaging: true,
                searched: true,
                term: isBlank(this.state.term) ? undefined : this.state.term
            })
        }
    }
   
    openCreator() {
        this.setState({
            create: cloneWith(this.state.create, {
                open: true,
                controls: this.defineCreatorControls()
            })
        });
    }

    closeCreator() {
        this.setState({
            create: cloneWith(this.state.create, {
                open: false
            })
        });
    }

    submitCreator(data: DataFormResult) {
        return this.subjectService.create(data as SubjectToPersist).pipe(
            tap(subject => {
                this.setState({
                    data: cloneArrayWith(this.state.data, subject)
                });
            })
        );
    }

    private defineCreatorControls(): DataFormControl[] {
        return [{
            type: 'text',
            label: 'Name',
            name: 'name',
            required: true
        }, {
            type: 'text',
            label: 'Notes',
            name: 'notes',
            extra: {
                multiline: true
            }
        }, {
            type: 'select',
            label: 'Opinion',
            name: 'opinion',
            required: true,
            values: opinions
        }];
    }

    closeEditor() {
        this.setState({
            edit: cloneWith(this.state.edit, {
                open: false
            })
        });
    }

    submitEditor(data: DataFormResult) {

        let subject = this.state.edit!.subject;

        return this.subjectService.update(subject.id, data as SubjectToPersist).pipe(
            tap(() => {
                transferTo(data, subject);
                this.setState({ data: cloneArray(this.state.data) });
            })
        )
    }

    private defineEditorControls(subject: Subject): DataFormControl[] {
        return [{
            type: 'text',
            label: 'Name',
            name: 'name',
            required: true,
            value: subject.name
        }, {
            type: 'text',
            label: 'Notes',
            name: 'notes',
            extra: {
                multiline: true
            },
            value: subject.notes
        }, {
            type: 'select',
            label: 'Opinion',
            name: 'opinion',
            required: true,
            values: opinions,
            value: subject.opinion
        }];
    }

    closeRemoveConfirmation() {
        this.setState({
            remove: cloneWith(this.state.remove, {
                open: false
            })
        });
    }

    handleRemoveConfirmation() {

        let subject = this.state.remove!.subject;

        return this.subjectService.remove(subject.id).pipe(
            tap(() => {
                this.setState({
                    data: cloneArrayExcept(this.state.data, subject)
                });
            })
        );
    }
}