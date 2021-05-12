import React, { Component, Fragment } from "react"
import DataView, { DataViewAction, DataViewColumn, DataViewPaged } from "../../../support/data/components/DataView";
import DataForm, { DataFormControl, DataFormResult } from "../../../support/form/components/DataForm";
import Container from "../../../support/ioc/Container";
import Schedule, { FinishedSchedule, ScheduleToPersist } from "../../models/Schedule";
import ScheduleService from "../../services/ScheduleService";
import moment from "moment";
import DataPaper from "../../../support/data/components/DataPaper";
import DataActionArea from "../../../support/data/components/DataActionArea";
import PopupForm from "../../../support/modal/components/PopupForm";
import { cloneArrayExcept, cloneArrayWith, cloneWith } from "../../../support/random/utils";
import { tap } from "rxjs/operators";
import Dish from "../../models/Dish";
import DishService from "../../services/DishService";
import { formatMoment } from "../../../support/mapping/converters";
import Confirmation from "../../../support/modal/components/Confirmation";
import { AiFillDelete, AiOutlineCheck } from "react-icons/ai";
import { Box } from "@material-ui/core";
import RequiredIngredientOverview from "../parts/RequiredIngredientOverview";
import { checkAll, checkMoment, checkPresentOrFuture } from "../../../support/validation/validators";
import PopupFormComposite from "../../../support/modal/components/PopupFormComposite";
import IngredientLineForm from "../parts/IngredientLineForm";


function dishesToValues(dishes: Dish[]): {[name: string]: string} {
    const result: {[name: string]: string} = {};
    
    dishes.forEach(dish => result[dish.id] = dish.name);

    return result;
}

interface ScheduleProps {
    container: Container;
}

interface ScheduleState {
    data: Schedule[];
    create?: {
        open: boolean;
        controls: DataFormControl[];
    },
    finish?: {
        open: boolean,
        controls: DataFormControl[],
        touched?: boolean,
        schedule: Schedule
    }
    remove?: {
        open: true,
        schedule: Schedule
    },
    dishes: Dish[]
}

class ScheduleView extends Component<ScheduleProps, ScheduleState> {

    private scheduleService: ScheduleService;
    private dishService: DishService;

    columns: DataViewColumn[] = [
        {
            name: 'dishName',
            path: 'dish.name',
            title: 'Scheduled Dish'
        },
        {
            name: 'requiredIngredients',
            title: 'Required Ingredients',
            component: schedule => (<RequiredIngredientOverview dish={schedule.dish} />)
        },
        {
            name: 'scheduledOn',
            pipe: v => moment(v).format('DD/MM/YYYY')
        }
    ];

    actions: DataViewAction[] = [{
        icon: <AiOutlineCheck />,
        onClick: schedule => {
            this.setState({
                finish: {
                    open: true,
                    schedule,
                    controls: this.defineFinisherControls()
                }
            });
        }
    }, {
        icon: <AiFillDelete />,
        onClick: schedule => {
            this.setState({
                remove: {
                    open: true,
                    schedule
                }
            });
        }
    }];

    
    constructor(props: ScheduleProps) {
        super(props);

        const container = props.container;
        
        this.scheduleService = container.get(ScheduleService);
        this.dishService = container.get(DishService);

        this.state = {
            data: [],
            dishes: []
        }
    }

    componentDidMount() {
        this.dishService.getAllLightweight().subscribe(dishes => {
            this.setState({
                dishes
            })
        });
    }

    private paged: DataViewPaged = {
        onChange: (offset, limit, filter?) => {

            filter = cloneWith(filter, { sort: 'scheduledOn:ASC'});

            return this.scheduleService.getAll(offset, limit, filter).pipe(
                tap(data => this.setState({ data }), error => this.setState( { data: [] }))
            );
        }
    };

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

    private defineCreatorControls(): DataFormControl[] {
        return [{
            type: 'autocomplete',
            label: 'Dish',
            name: 'dishId',
            values: dishesToValues(this.state.dishes),
            required: true
        }, {
            type: 'date',
            label: 'Schedule On',
            name: 'scheduledOn',
            required: true,
            validate: checkAll(checkMoment('DD/MM/YYYY'), checkPresentOrFuture('DD/MM/YYYY')),
            convertOut: formatMoment('YYYY-MM-DD'),
            extra: {
                constraint: 'only-future'
            }
        }];
    }

    submitCreator(data: DataFormResult) {
        return this.scheduleService.create(data as ScheduleToPersist).pipe(
            tap(schedule => {
                this.setState({
                    data: cloneArrayWith(this.state.data, schedule)
                });
            })
        );
    }

    
    closeRemoveConfirmation() {
        this.setState({
            remove: cloneWith(this.state.remove, {
                open: false
            })
        });
    }

    handleRemoveConfirmation() {

        let schedule = this.state.remove!.schedule;

        return this.scheduleService.remove(schedule.id).pipe(
            tap(() => {
                this.setState({
                    data: cloneArrayExcept(this.state.data, schedule)
                });
            })
        );
    }

    private defineFinisherControls(): DataFormControl[] {
        return [{
            type: 'text',
            label: 'Notes',
            name: 'notes',
            required: true,
            extra: { multiline: true }
        }];
    }

    closeFinisher() {
        this.setState({
            finish: cloneWith(this.state.finish, {
                open: false
            })
        });
    }

    submitFinisher(data: DataFormResult) {

        const schedule = this.state.finish!.schedule;

        return this.scheduleService.finish(schedule.id, data as FinishedSchedule)
            .pipe(
                tap(() => {
                    this.setState({
                        data: cloneArrayExcept(this.state.data, schedule)
                    });
                })
            )
    }

    render() {

        const { data } = this.state;

        return (<Fragment>
            <DataPaper>
                <DataView
                    title="Schedules"
                    data={data}
                    actions={this.actions}
                    paged={this.paged}
                    columns={this.columns} />
                    <DataActionArea onCreate={this.openCreator.bind(this)} />
            </DataPaper>
            {this.state.create && (<PopupForm
                controls={this.state.create!.controls}
                onClose={this.closeCreator.bind(this)}
                onSubmit={this.submitCreator.bind(this)}
                open={this.state.create!.open}
                title="Schedule - Create" />) }
            {this.state.remove && (<Confirmation
                onClose={this.closeRemoveConfirmation.bind(this)}
                onHandle={this.handleRemoveConfirmation.bind(this)}
                confirmButtonTitle="Proceed"
                open={this.state.remove!.open}
                title="Schedule - Delete">
                {`You are about to delete "${this.state.remove!.schedule.dish.name}". Do you want to proceed?`}
            </Confirmation>)}
            {this.state.finish && (<PopupFormComposite size="sm"
                touched={this.state.finish!.touched }
                elements={[
                    {
                        type: 'form',
                        component: props => <DataForm {...props} controls={this.state.finish!.controls } />
                    },
                    {
                        type: 'custom',
                        component: <Box m={2} />
                    },
                    {
                        type: 'form',
                        component: props => <IngredientLineForm
                            { ...props }
                            dish={this.state.finish!.schedule.dish} />
                    }
                ]}
                onClose={this.closeFinisher.bind(this)}
                onSubmit={this.submitFinisher.bind(this)}
                open={this.state.finish!.open}
                title={`Schedule - Finish`} />) } 
        </Fragment>);
    }
}

export default ScheduleView;