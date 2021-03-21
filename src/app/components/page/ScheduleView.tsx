import React, { Component, Fragment, ReactElement } from "react"
import DataView, { DataViewAction, DataViewColumn, DataViewPaged } from "../../../support/data/components/DataView";
import { DataFormControl, DataFormRendererRegistry, DataFormResult } from "../../../support/form/components/DataForm";
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
import { Box, createStyles, Theme, withStyles } from "@material-ui/core";
import IngredientLinePlugin, { ingredientLineStyles } from "../plugins/IngredientLinePlugin";
import Ingredient from "../../models/Ingredient";
import IngredientService from "../../services/IngredientService";


function dishesToValues(dishes: Dish[]): {[name: string]: string} {
    const result: {[name: string]: string} = {};
    
    dishes.forEach(dish => result[dish.id] = dish.name);

    return result;
}

interface ScheduleProps {
    container: Container;
    classes: {[name: string]: string};
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
    dishes: Dish[],
    ingredients: Ingredient[]
}

const styles = (theme: Theme) => createStyles(ingredientLineStyles);

class ScheduleView extends Component<ScheduleProps, ScheduleState> {

    private scheduleService: ScheduleService;
    private dishService: DishService;
    private ingredientService: IngredientService;

    private ingredientLinePlugin = new IngredientLinePlugin(
        () => ({
            controls: this.state.finish?.controls || [],
            ingredients: this.state.ingredients
        }),
        attributes => this.setState({
            finish: cloneWith(this.state.finish, attributes)
        }),
        () => this.defineFinisherControls(),
        this.props.classes
    )

    columns: DataViewColumn[] = [
        {
            name: 'dish',
            title: 'Scheduled Dish',
            pipe: dish => dish.name
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
                    controls: this.ingredientLinePlugin.preloadIngredientLineControls(schedule.dish)
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
        this.ingredientService = container.get(IngredientService);

        this.state = {
            data: [],
            dishes: [],
            ingredients: []
        }
    }

    componentDidMount() {
        this.dishService.getAllLightweight().subscribe(dishes => {
            this.setState({
                dishes
            })
        });

        this.ingredientService.getAllLightweight().subscribe(ingredients => {
            this.setState({
                ingredients
            })
        });
    }

    private paged: DataViewPaged = {
        onChange: (offset, limit) => {
            this.scheduleService.getAll(offset, limit).subscribe(data => {
                this.setState({ data  });
            }, error => {
                this.setState({ data: [] });
                console.error(error);
            });
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
            convertOut: formatMoment('YYYY-MM-DDT00:00:00'),
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

    private defineFinisherLayout(renderers: DataFormRendererRegistry): ReactElement {
        return (<Fragment>
            { renderers['notes']() }
            <Box m={2} />
            { this.ingredientLinePlugin.renderIngredientLines(renderers) }
        </Fragment>);
    }

    closeFinisher() {
        this.setState({
            finish: cloneWith(this.state.finish, {
                open: false
            })
        });
    }

    submitFinisher(data: DataFormResult) {

        const finished: FinishedSchedule = {
            notes: data['notes'],
            wastes: this.ingredientLinePlugin.extractWastes(data)
        }

        const schedule = this.state.finish!.schedule;

        return this.scheduleService.finish(schedule.id, finished)
            .pipe(
                tap(() => {
                    this.setState({
                        data: cloneArrayExcept(this.state.data, schedule)
                    });
                })
            )
    }

    validateFinisher(result: DataFormResult) {
        return this.ingredientLinePlugin.afterValidate(result, {});
    }
    
    render() {

        const { data } = this.state;

        return (<Fragment>
            <DataPaper>
                <DataView
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
            {this.state.finish && (<PopupForm size="sm"
                touched={this.state.finish!.touched }
                layout={this.defineFinisherLayout.bind(this)}
                controls={this.state.finish!.controls}
                onClose={this.closeFinisher.bind(this)}
                onValidate={this.validateFinisher.bind(this)}
                onSubmit={this.submitFinisher.bind(this)}
                open={this.state.finish!.open}
                title={`Schedule - Finish`} />) } 
        </Fragment>);
    }
}

export default withStyles(styles)(ScheduleView);