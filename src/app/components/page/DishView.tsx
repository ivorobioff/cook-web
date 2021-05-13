import React, { Component, Fragment } from "react";
import { withStyles, createStyles, Theme, Box } from "@material-ui/core";
import DataActionArea from "../../../support/data/components/DataActionArea";
import DataPaper from "../../../support/data/components/DataPaper";
import DataView, { DataViewAction, DataViewColumn, DataViewPaged } from "../../../support/data/components/DataView";
import Container from "../../../support/ioc/Container";
import Dish, { DishToPersist, Ingredient } from "../../models/Dish";
import DishService from "../../services/DishService";
import DataForm, { DataFormControl, DataFormResult } from "../../../support/form/components/DataForm";
import { cloneArray, cloneArrayWith, cloneWith, transferTo, ucFirst, cloneArrayExcept } from "../../../support/random/utils";
import { tap } from "rxjs/operators";
import PopupForm from "../../../support/modal/components/PopupForm";
import { AiFillDelete, AiOutlineCalendar, AiOutlineEdit, AiOutlineHistory } from "react-icons/ai";
import Confirmation from "../../../support/modal/components/Confirmation";
import HistoryService from "../../services/HistoryService";
import Popup from "../../../support/modal/components/Popup";
import moment from 'moment';
import History from "../../models/History";
import RequiredIngredientOverview from "../parts/RequiredIngredientOverview";
import ScheduleService from "../../services/ScheduleService";
import { formatMoment } from "../../../support/mapping/converters";
import { checkAll, checkMoment, checkPresentOrFuture } from "../../../support/validation/validators";
import PopupFormComposite from "../../../support/modal/components/PopupFormComposite";
import IngredientLineForm from "../parts/IngredientLineForm";
import { sorting, textFilter } from "../../../support/data/components/query/controls";
import NoteCell from "../parts/NoteCell";

interface DishProps {
    container: Container;
    classes: {[name: string]:string};
}

interface DishState {
    data: Dish[],
    persister?: {
        intent: 'create' | 'edit',
        dish?: Dish,
        open: boolean;
        controls: DataFormControl[];
    },
    history?: {
        dish: Dish,
        open: boolean,
        data: History[]
    },
    schedule?: {
        dish: Dish,
        open: boolean,
        controls: DataFormControl[]
    },
    remove?: {
        open: true,
        dish: Dish
    }
}

const styles = (theme: Theme) => createStyles({
    
});

class DishView extends Component<DishProps, DishState> {

    private dishService: DishService;
    private historyService: HistoryService;
    private scheduleService: ScheduleService;

    private paged: DataViewPaged = {
        onChange: (offset, limit, filter?: DataFormResult) => {
            return this.dishService.getAll(offset, limit, filter).pipe(
                tap({
                    next: data => {
                        this.setState({ data  });
                    },
                    error: () => {
                        this.setState({ data: [] });
                    }
                })
            );
        }
    };

    get columns(): DataViewColumn[] {
        return [
            {
                name: 'name',
                query: {
                    controls: [
                        textFilter('name')
                    ]
                }
            },
            {
                name: 'notes',
                query: {
                    controls: [
                        textFilter('notes')
                    ]
                },
                component: (dish: Dish) => (<NoteCell content={dish.notes} />)
            },
            {
                name: 'ingredients',
                title: 'Required Ingredients',
                component: dish => (<RequiredIngredientOverview dish={dish} />)
            },
            {
                name: 'lastFinishedAt',
                title: 'Last Cook Date',
                pipe: v => v ? moment(v).format('DD/MM/YYYY') : ' - ',
                query: {
                    controls: [
                        sorting('lastFinishedAt')
                    ]
                }
            },
        ];
    }

    historyColumns: DataViewColumn[] = [
        {
            name: 'notes',
            component: (history: History) => (<NoteCell content={history.notes} />)
        },
        {
            name: 'ingredients',
            title: 'Ingredients Used',
            component: history => (<Fragment>
                {history.ingredients.map((ingredient: Ingredient, i: number) => {
                    return (<div key={`i-${i}`}>{ ingredient.name } - {ingredient.quantity}</div>)
                })}
            </Fragment>)
        },
        {
            name: 'scheduledOn',
            pipe: v => moment(v).format('DD/MM/YYYY')
        },
        {
            name: 'finishedAt',
            title: 'Finish Date',
            pipe: v => moment(v).format('DD/MM/YYYY')
        }
    ];

    private historyPaged: DataViewPaged = {
        onChange: (offset, limit) => {
            this.historyService.getAll(this.state.history!.dish.id, offset, limit).subscribe(history => {
                this.setState({
                    history: cloneWith(this.state.history, { data: history })  
                });
            }, error => {
                this.setState({ data: [] });
                console.error(error);
            });
        }
    };

    actions: DataViewAction[] = [{
        icon: <AiOutlineCalendar />,
        onClick: dish => {
            this.setState({
                schedule: {
                    open: true,
                    dish,
                    controls: this.defineSchedulerControls()
                }
            });
        }
    }, {
        icon: <AiOutlineHistory />,
        onClick: dish => {
            this.setState({
                history: {
                    open: true,
                    dish,
                    data: []
                }
            });
        },
        disabled: dish => !dish.lastFinishedAt
    },{
        icon: <AiOutlineEdit />,
        onClick: dish => {
            this.setState({
                persister: {
                    intent: 'edit',
                    open: true,
                    dish,
                    controls: this.definePersisterControls(dish)
                }
            });
        }
    }, {
        icon: <AiFillDelete />,
        onClick: dish => {
            this.setState({
                remove: {
                    open: true,
                    dish
                }
            });
        },
        disabled: ingredient => ingredient.usedByDish
    }];

    constructor(props: DishProps) {
        super(props);

        this.dishService = props.container.get(DishService);
        this.historyService = props.container.get(HistoryService);
        this.scheduleService = props.container.get(ScheduleService);

        this.state = {
            data: []
        }
    }

    openPersisterForCreate() {
        this.setState({
            persister: cloneWith(this.state.persister, {
                intent: 'create',
                open: true,
                dish: undefined,
                controls: this.definePersisterControls()
            })
        });
    }

    closePersister() {
        this.setState({
            persister: cloneWith(this.state.persister, {
                open: false
            })
        });
    }

    submitPersister(data: DataFormResult) {

        const intent = this.state.persister!.intent;
    
        if (intent === 'edit') {
            const dish = this.state.persister!.dish!;

            return this.dishService.update(dish.id, data as DishToPersist).pipe(
                tap(updated => {
                    transferTo(updated, dish);
                    this.setState({ data: cloneArray(this.state.data) });
                })
            );
        }

        return this.dishService.create(data as DishToPersist).pipe(
            tap(dish => {
                this.setState({
                    data: cloneArrayWith(this.state.data, dish)
                });
            })
        );
    }

    private definePersisterControls(dish?: Dish): DataFormControl[] {

        return [{
            type: 'text',
            label: 'Name',
            name: 'name',
            required: true,
            value: dish?.name
        }, {
            type: 'text',
            label: 'Notes',
            name: 'notes',
            uselessOut: '',
            value: dish?.notes,
            extra: { multiline: true }
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

        let dish = this.state.remove!.dish!;

        return this.dishService.remove(dish.id).pipe(
            tap(() => {
                this.setState({
                    data: cloneArrayExcept(this.state.data, dish)
                });
            })
        );
    }

    closeHistory() {
        this.setState({
            history: cloneWith(this.state.history, {
                open: false
            })
        })
    }
    
    closeScheduler() {
        this.setState({
            schedule: cloneWith(this.state.schedule, {
                open: false
            })
        })
    }

    submitScheduler(data: DataFormResult) {
        return this.scheduleService.create({
            dishId: this.state.schedule!.dish.id,
            scheduledOn: data['scheduledOn']
        });
    }

    private defineSchedulerControls(): DataFormControl[] {
        return [
            {
                type: 'date',
                label: 'Schedule On',
                name: 'scheduledOn',
                required: true,
                value: null,
                validate: checkAll(checkMoment('DD/MM/YYYY'), checkPresentOrFuture('DD/MM/YYYY')),
                convertOut: formatMoment('YYYY-MM-DD'),
                extra: {
                    constraint: 'only-future'
                }
            }
        ];
    }

    render() {
        
        const { data } = this.state;

        return (<Fragment>
            <DataPaper>
                <DataView
                    title="Dishes"
                    data={data}
                    paged={this.paged}
                    actions={this.actions}
                    columns={this.columns} />
                    <DataActionArea onCreate={() => this.openPersisterForCreate()} />
            </DataPaper>
            {this.state.persister && (<PopupFormComposite size="sm"
                elements={[
                    {
                        type: 'form',
                        component: props => (<DataForm { ...props} controls={this.state.persister!.controls} />)
                    },
                    {
                        type: 'custom',
                        component: (<Box m={2} />)
                    },
                    {
                        type: 'form',
                        component: props => (<IngredientLineForm { ...props} dish={this.state.persister!.dish} />)
                    }
                ]}
                onClose={this.closePersister.bind(this)}
                onSubmit={this.submitPersister.bind(this)}
                open={this.state.persister!.open}
                title={`Dish - ${ucFirst(this.state.persister!.intent)}`} />) } 

            {this.state.remove && (<Confirmation
                onClose={this.closeRemoveConfirmation.bind(this)}
                onHandle={this.handleRemoveConfirmation.bind(this)}
                confirmButtonTitle="Proceed"
                open={this.state.remove!.open}
                title="Dish - Delete">
                {`You are about to delete "${this.state.remove!.dish.name}". Do you want to proceed?`}
            </Confirmation>)}

            {this.state.history && (<Popup
                size="md"
                onClose={this.closeHistory.bind(this)}
                open={this.state.history!.open}
                submitButtonTitle="OK"
                title={`${this.state.history.dish.name} - History`}>
                     <DataPaper>
                        <DataView
                            data={this.state.history!.data}
                            paged={this.historyPaged}
                            columns={this.historyColumns} />
                    </DataPaper>
            </Popup>)}

            {this.state.schedule && (<PopupForm
                controls={this.state.schedule!.controls}
                onClose={this.closeScheduler.bind(this)}
                onSubmit={this.submitScheduler.bind(this)}
                open={this.state.schedule!.open}
                title="Dish - Schedule" />) }
            
        </Fragment>);
    }
}

export default withStyles(styles)(DishView);