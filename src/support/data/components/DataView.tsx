import React, {Component, Fragment, ReactElement, MouseEvent} from 'react';
import { Theme, createStyles, withStyles, Table, TableHead, TableRow, TableCell, TableBody, Typography, TableContainer, CircularProgress } from '@material-ui/core';
import IconButton from "@material-ui/core/IconButton";
import {
    cloneExcept,
    cloneWith,
    fromCamelCaseToHumanCase,
    mergeWith,
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
import { isBlank } from '../../validation/utils';
import { FiFilter, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { Alert } from '@material-ui/lab';

const styles = (theme: Theme) => createStyles({
    actable: {
        borderBottomStyle: 'dotted',
        borderBottomWidth: 'thin',
        cursor: 'pointer'
    },
    actableColumn: {
        borderBottomStyle: 'dotted',
        borderBottomWidth: 'thin',
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
    },
    loadingFailed: {
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
    onChange: (offset: number, limit: number, filter?: DataFormResult) => Observable<any> | void;
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

interface DataViewSortedState {
    value: 'DESC' | 'ASC';
    column: DataViewColumn;
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
    sorted?: DataViewSortedState;
    loading: boolean;
    loadingError?: string;
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
            filtered: {},
            loading: false
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


    private renderFilterIcon(column: DataViewColumn):ReactElement | undefined {
        if (this.state.filtered[column.name]) {
            return <FiFilter />;
        }
    }

    private renderSortIcon(column: DataViewColumn): ReactElement | undefined  {
        const sorted = this.state.sorted;
        
        if (!sorted) {
            return undefined;
        }

        const sortedColumn = sorted!.column;

        if (sortedColumn.name !== column.name) {
            return undefined;
        }

        const sort = sorted!.value;

        if (sort.endsWith(':ASC')) {
            return (<FiChevronUp />)
        }
        
        if (sort.endsWith(':DESC')) {
            return (<FiChevronDown />);
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
                                            { this.renderFilterIcon(column) }
                                            { this.renderSortIcon(column)  }
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

                    { this.state.loadingError && (<Alert className={this.props.classes.loadingFailed} severity="error">{this.state.loadingError}</Alert>) }


            {this.isPaged() && (<div className={classes.paged}>
                { this.state.loading && (<Fragment>
                    <CircularProgress color="secondary" />
                </Fragment>)}

                { !this.state.loading && (<Fragment>
                    <IconButton disabled={!this.state.canGoBack} onClick={() => this.move(false)}>
                        <MdArrowBack size={20} />
                    </IconButton>

                    <IconButton disabled={!this.state.canGoForward} onClick={() => this.move(true)}>
                        <MdArrowForward size={20} />
                    </IconButton>
                </Fragment>)}
            </div>)}

                { this.createFilter() }

            </Fragment>);
    }

    clickOnColumn(event: MouseEvent<HTMLElement>, column: DataViewColumn) {
        if (column.query ){
            this.setState({
                filter: {
                    open: true,
                    column,
                    filtered: this.state.filtered[column.name]
                }
            })
        }
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

        let sort = data['sort'];

        data['sort'] = undefined;

        let sortChange;

        if (sort) {
            sortChange = {
                sorted: {
                    column,
                    value: sort
                }
            };
        } else if (column.name === this.state.sorted?.column.name) {
            sortChange = {
                sorted: undefined
            }
        }

        if (sortChange) {
            this.setState(sortChange);
        }

        let filtered = this.state.filtered;

        const hasData = Object.keys(data)
            .filter(key => !isBlank(data[key])).length > 0;
        
        if (hasData) {
            filtered = cloneWith(filtered, {
                [column.name]: data
            }); 
        } else if (filtered[column.name]) {
            filtered = cloneExcept(filtered, column.name);
        }

        if (filtered !== this.state.filtered) {
            this.setState({ filtered });
        }
        
        const result = this.forwardFiltering(column, filtered, sortChange);

        if (result) {
            return result;
        }

        return singleton(done => done(undefined));        
    }

    cancelFilter() {

        const column = this.state.filter!.column;

        let sortChange;

        if (column.name === this.state.sorted?.column.name) {
            sortChange = {
                sorted: undefined
            };
        }

        if (sortChange) {
            this.setState(sortChange);
        }

        const filtered = cloneExcept(this.state.filtered, column.name);

        this.setState({ filtered });

        this.forwardFiltering(column, filtered, sortChange);
    }

    private forwardFiltering(
        column: DataViewColumn, 
        filtered: {[name: string]: DataFormResult}, 
        sortChange?: { sorted?: DataViewSortedState }): Observable<any> | undefined {
        const sort = sortChange
            ? sortChange.sorted?.value 
            : this.state.sorted?.value;
        

        const filteredWithSorted: DataFormResult = {};

        Object.keys(filtered).forEach(name => {
            mergeWith(filteredWithSorted, filtered[name]);
        });

        if (sort) {
            filteredWithSorted['sort'] = sort;
        }

        if (this.isPaged()) {
            this.changePage(1, filteredWithSorted);
        } else if (this.props.onFilterSubmit) {
            const result = this.props.onFilterSubmit(filteredWithSorted, column);

            if (result) {
                return result;
            }
        }
    }

    private createFilter(): ReactElement | undefined {
        if (!this.state.filter) {
            return undefined;
        }

        const column = this.state.filter!.column;
        const sort = this.state.sorted?.column.name === column.name ? this.state.sorted?.value : undefined;
        
        let filtered = this.state.filter!.filtered;
        
        if (sort) {
            filtered = cloneWith(filtered, {
                sort
            })
        }

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

    changePage(page: number, filter?: DataFormResult) {

        let paged = readField<DataViewPaged>(this.props, 'paged');

        this.setState({
            canGoForward: false,
            canGoBack: false
        });

        this.page = page;

        let limit = this.limit();

        let offset = ((page * limit) - limit) - (page - 1);

        const result = paged.onChange(offset, limit, filter);

        if (result) {
            
            this.setState({
                loading: true,
                loadingError: undefined
            });

            result.subscribe({
                error: e => {
                    console.error(e);
                    this.setState({
                        loading: false,
                        loadingError: 'Failed to load the data. Please try again!'
                    })
                },
                complete: () => {
                    this.setState({
                        loading: false
                    });
                }
            });
        }
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