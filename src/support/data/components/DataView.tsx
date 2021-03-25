import React, {Component, Fragment, ReactElement, MouseEvent} from 'react';
import { Theme, createStyles, withStyles, Table, TableHead, TableRow, TableCell, TableBody, Typography, TableContainer } from '@material-ui/core';
import IconButton from "@material-ui/core/IconButton";
import {
    cloneExcept,
    cloneWith,
    fromCamelCaseToHumanCase,
    readField, tryField, ucFirst,
    valueByPath
} from '../../random/utils';
import {toMoney} from "../../mapping/converters";
import {MdArrowBack, MdArrowForward} from 'react-icons/md';
import { DataFormControl, DataFormResult } from '../../form/components/DataForm';
import { DataFormCompositeElement } from '../../form/components/DataFormComposite';
import { Observable } from 'rxjs';
import PopupForm from '../../modal/components/PopupForm';
import PopupFormComposite from '../../modal/components/PopupFormComposite';
import { singleton } from '../../mapping/operators';

const styles = (theme: Theme) => createStyles({
    actable: {
        borderBottomStyle: 'dotted',
        borderBottomWidth: 'thin',
        cursor: 'pointer'
    },
    actableColumn: {
        cursor: 'pointer'
    },
    actionCell: {
        width: 40,
        padding: 0,
        textAlign: 'center'
    },
    cellTextColorError: {
        color: theme.palette.error.dark
    },
    cellTextColorSuccess: {
        color: theme.palette.success.dark
    },
    cellTextColorWarning: {
        color: theme.palette.warning.dark
    },
    paged: {
        display: 'flex',
        justifyContent: 'center',
        marginTop: theme.spacing(1),
    }
});

export enum DataViewCellFormat {
    DEFAULT = 0,
    MONEY = 1,
}

export interface DataViewCellClickContext {
    anchor: HTMLElement
}

export type DataViewTitleResolver = (row: any) => string;
export type DataViewPipeHandler = (value: any, row: any) => any;

export type DataViewCellTextColor = 'error' | 'success' | 'warning' | null | undefined;
export type DataViewCellTextColorResolver = (value: any, row: any) => DataViewCellTextColor;
export type DataViewOnClickCellHandler = (row: any, context: DataViewCellClickContext) => void;
export type DataViewFilterSubmitHandler = (data: DataFormResult, column: DataViewColumn) => Observable<any> | void;

export interface DataViewColumnQuery {
    controls?: DataFormControl[];
    elements?: DataFormCompositeElement[];
}

export interface DataViewColumn {
    title?: string;
    name: string;
    path?: string;
    format?: DataViewCellFormat;
    pipe?: DataViewPipeHandler;
    component?: (row: any) => ReactElement | null | undefined;
    color?: DataViewCellTextColorResolver;
    canClick?: (row: any) => boolean; 
    onClick?: DataViewOnClickCellHandler;
    query?: DataViewColumnQuery;
}

export interface DataViewAction {
    icon: ReactElement;
    onClick: (row: any) => void;
    disabled?: (row: any) => boolean;
}

export interface DataViewPaged {
    limit?: number;
    onChange: (offset: number, limit: number) => void;
}

export interface DataViewProps {
    data: any[],
    columns: DataViewColumn[],
    actions?: DataViewAction[],
    classes: {[name: string]:string};
    title?: string;
    paged?: DataViewPaged;
    repaging?: boolean;
    onFilterSubmit?: DataViewFilterSubmitHandler;
}

interface DataViewState {
    data: any[];
    canGoForward: boolean;
    canGoBack: boolean;
    filter?: {
        open: boolean;
        column: DataViewColumn;
        filtered?: DataFormResult;
    }
    filtered: {[name: string]: DataFormResult};
}

function canClickCell(row: any, column: DataViewColumn) {
    if (typeof column.onClick !== 'function') {
        return false;
    }

    return (column.canClick || (() => true))(row);
}

function resolveValue(row: any, column: DataViewColumn): string {

    let path = column.path || column.name;

    let value = valueByPath(path, row);
    let format = column.format || DataViewCellFormat.DEFAULT;

    if (format === DataViewCellFormat.MONEY) {
        if (typeof value !== 'undefined' && value !== null) {
            value = toMoney(value);
        }
    }

    if (column.pipe) {
        value = column.pipe(value, row);
    }

    return value;
}

function resolveAlignment(column: DataViewColumn) {
    let format = column.format || DataViewCellFormat.DEFAULT;

    if (format === DataViewCellFormat.MONEY) {
        return 'right'
    }

    return 'left';
}

function resolveValueClasses(row: any, column: DataViewColumn, classes: {[name: string]: string}): string {

    const result = [];

    if (canClickCell(row, column)) {
        result.push(classes['actable']);
    }

    if (column.color) {
        const color = column.color(resolveValue(row, column), row);

        if (color) {
            result.push(classes[`cellTextColor${ucFirst(color)}`])
        }
    }

    return result.join(' ');
}

function resolveTitle(column: DataViewColumn): string {
    return column.title || column.name.split('.').map(fromCamelCaseToHumanCase).join(' ');
}

const DEFAULT_PAGE_LIMIT = 20;

const DEFAULT_ACTION_DISABLED = (row: any) => false;

class DataView extends Component<DataViewProps, DataViewState> {

    private page = 0;

    constructor(props: DataViewProps) {
        super(props);

        this.state = {
            data: [],
            canGoBack: false,
            canGoForward: false,
            filtered: {}
        }
    }

    componentDidMount() {
        if (this.isPaged()) {
            this.changePage(1);
        }
    }

    componentDidUpdate(prevProps: DataViewProps): void {
        if (this.props.data !== prevProps.data) {
            this.setState({ data: this.props.data });

            if (this.isPaged()) {
                let total = this.props.data.length;

                this.setState({
                    canGoForward: total === this.limit(),
                    canGoBack: this.page > 1
                });
            }
        }

        if (this.props.repaging !== prevProps.repaging && this.props.repaging === true && this.isPaged()) {
            this.changePage(1);
        }
    }

    render() {
        const {
            columns,
            actions = [],
            title,
            classes
        } = this.props;

        const {
            data
        } = this.state;

        return (<Fragment>
                    {title && (<Typography component="h2" variant="h6" color="primary">{title}</Typography>)}
                    <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                            {columns.map((column, i) => {
                                return (<TableCell 
                                    key={`c-${i}`} 
                                    align={resolveAlignment(column)}>
                                        <span className={this.resolveColumnClasses(column)}
                                            onClick={e => this.clickOnColumn(e, column)}>{resolveTitle(column)}</span>
                                        </TableCell>);
                            })}
                            {actions.map((action, i) => {
                                return (<TableCell key={`c-${i}`}>&nbsp;</TableCell>);
                            })}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.map((row, i) => {
                                if (this.isPaged() && data.length === this.limit() && i === data.length - 1) {
                                    return undefined;
                                }

                                return (<TableRow key={`r-${i}`}>
                                    {columns.map((column, i) => {
                                        
                                        if (typeof column.component === 'function') {
                                            const component = column.component(row);

                                            if (!component) {
                                                return (<TableCell key={`c-${i}`}></TableCell>);
                                            }

                                            return (<TableCell key={`c-${i}`}>{component}</TableCell>);
                                        }

                                        return (<TableCell
                                            key={`c-${i}`}
                                            align={resolveAlignment(column)}>
                                                <span
                                                    {
                                                        ...{
                                                            onClick: event => this.clickOnCell(event, row, column)
                                                        }
                                                    }

                                                    className={resolveValueClasses(row, column, classes)}>{resolveValue(row, column)}</span>
                                        </TableCell>);
                                    })}
                                    { actions.map((action, i) => {

                                        let disabled = action.disabled;

                                        if (!disabled) {
                                            disabled = DEFAULT_ACTION_DISABLED;
                                        }

                                        return (<TableCell className={classes.actionCell} key={`a-${i}`}>
                                            <IconButton disabled={ disabled(row) } onClick={() => action.onClick(row)}>
                                                {React.cloneElement(action.icon, { size: 20 })}
                                            </IconButton>
                                        </TableCell>);
                                    })}
                                </TableRow>);
                            })}
                        </TableBody>
                    </Table>
                    </TableContainer>
            {this.isPaged() && (<div className={classes.paged}>
                <IconButton disabled={!this.state.canGoBack} onClick={() => this.move(false)}>
                    <MdArrowBack size={20} />
                </IconButton>

                <IconButton disabled={!this.state.canGoForward} onClick={() => this.move(true)}>
                    <MdArrowForward size={20} />
                </IconButton>
            </div>)}

                { this.createFilter() }

            </Fragment>);
    }

    clickOnColumn(event: MouseEvent<HTMLElement>, column: DataViewColumn) {

        this.setState({
            filter: {
                open: true,
                column,
                filtered: this.state.filtered[column.name]
            }
        })
    }

    closeFilter() {
        this.setState({
            filter: cloneWith(this.state.filter, {
                open: false
            })
        })        
    }

    submitFilter(data: DataFormResult) {

        const column = this.state.filter!.column;

        this.setState({
            filtered: cloneWith(this.state.filtered, {
                [column.name]: data
            })
        })

        if (this.props.onFilterSubmit) {
            const result = this.props.onFilterSubmit(data, column);

            if (result) {
                return result;
            }
        }

        return singleton(done => done(undefined));        
    }

    cancelFilter() {

        const column = this.state.filter!.column;

        this.setState({
            filtered: cloneExcept(this.state.filtered, column.name)
        });
    }

    private createFilter(): ReactElement | undefined {
        if (!this.state.filter) {
            return undefined;
        }

        const column = this.state.filter!.column;
        const filtered = this.state.filter!.filtered;
        const query = column!.query!;
        const open = this.state.filter!.open;

        const props = {
            title: `${resolveTitle(column)} - Filter`,
            onClose: this.closeFilter.bind(this),
            onSubmit: this.submitFilter.bind(this),
            submitButtonTitle: 'Filter',
            open,
            cancelButtonTitle: 'Clear',
            onCancel: this.cancelFilter.bind(this),
            value: filtered,
            cancelButtonDisabled: !filtered
        };

        if (query.controls) {
            return (<PopupForm
                { ...props}
                controls={query.controls!}
                />);
        }

        return (<PopupFormComposite { ...props} elements={query.elements!} />);
    }

    clickOnCell(event: MouseEvent<HTMLElement>, row: any, column: DataViewColumn) {

        if (canClickCell(row, column)) {
            column.onClick!(row, {
                anchor: event.currentTarget
            });
        }
    }

    
    private resolveColumnClasses(column: DataViewColumn): string {
        const classes = [];

        if (this.isColumnClickable(column)) {
            classes.push(this.props.classes['actableColumn']);
        }

        return classes.join(' ');
    }

    private isColumnClickable(column: DataViewColumn): boolean {
        return typeof column.query?.controls !== 'undefined' 
            || typeof column.query?.elements !== 'undefined';
    }

    changePage(page: number) {

        let paged = readField<DataViewPaged>(this.props, 'paged');

        this.setState({
            canGoForward: false,
            canGoBack: false
        });

        this.page = page;

        let limit = this.limit();

        let offset = ((page * limit) - limit) - (page - 1);

        paged.onChange(offset, limit);
    }

    move(forward: boolean) {
        this.changePage(forward ? this.page + 1 : this.page - 1);
    }

    isPaged(): boolean {
        return !!this.props.paged;
    }

    limit(): number {
        return tryField<number>(this.props, 'paged.limit', DEFAULT_PAGE_LIMIT) + 1;
    }
}

export default withStyles(styles)(DataView);