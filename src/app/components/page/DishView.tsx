import React, { Component, Fragment, ReactElement } from "react";
import { withStyles, createStyles, Theme, Box } from "@material-ui/core";
import DataActionArea from "../../../support/data/components/DataActionArea";
import DataPaper from "../../../support/data/components/DataPaper";
import DataView, { DataViewAction, DataViewColumn, DataViewPaged } from "../../../support/data/components/DataView";
import Container from "../../../support/ioc/Container";
import Dish, { DishToPersist, RequiredIngredient } from "../../models/Dish";
import Ingredient from "../../models/Ingredient";
import DishService from "../../services/DishService";
import { DataFormControl, DataFormRendererRegistry, DataFormResult } from "../../../support/form/components/DataForm";
import { cloneArray, cloneArrayWith, cloneWith, transferTo, ucFirst, cloneArrayExcept } from "../../../support/random/utils";
import { tap } from "rxjs/operators";
import PopupForm from "../../../support/modal/components/PopupForm";
import IngredientService from "../../services/IngredientService";
import { AiFillDelete, AiOutlineEdit, AiOutlineHistory } from "react-icons/ai";
import Confirmation from "../../../support/modal/components/Confirmation";
import IngredientLinePlugin, { ingredientLineStyles } from "../plugins/IngredientLinePlugin";
import HistoryService from "../../services/HistoryService";
import Popup from "../../../support/modal/components/Popup";
import moment from 'moment';
import { Waste } from "../../models/History";

interface DishProps {
    container: Container;
    classes: {[name: string]:string};
}

interface DishState {
    data: Dish[],
    ingredients: Ingredient[],
    persister?: {
        intent: 'create' | 'edit',
        dish?: Dish,
        open: boolean;
        controls: DataFormControl[];
        touched?: boolean;
    },
    history?: {
        dish: Dish,
        open: boolean,
        data: History[]
    },
    remove?: {
        open: true,
        dish: Dish
    },
}

const styles = (theme: Theme) => createStyles(cloneWith({
    noIngredient: {
        color: theme.palette.error.dark
    }
}, ingredientLineStyles));

class DishView extends Component<DishProps, DishState> {

    private dishService: DishService;
    private ingredientService: IngredientService;
    private historyService: HistoryService;

    private ingredientLinePlugin = new IngredientLinePlugin(
        () => ({
            controls: this.state.persister?.controls || [],
            ingredients: this.state.ingredients
        }),
        attributes => this.setState({
            persister: cloneWith(this.state.persister, attributes)
        }),
        dish =>  this.definePersisterControls(dish),
        this.props.classes
    );

    private paged: DataViewPaged = {
        onChange: (offset, limit) => {
            this.dishService.getAll(offset, limit).subscribe(data => {
                this.setState({ data  });
            }, error => {
                this.setState({ data: [] });
                console.error(error);
            });
        }
    };

    columns: DataViewColumn[] = [
        {
            name: 'name'
        },
        {
            name: 'notes',
        },
        {
            name: 'requiredIngredients',
            component: dish => (<Fragment>
                {dish.requiredIngredients!.map(this.renderIngredient.bind(this))}
            </Fragment>)
        }
    ];

    historyColumns: DataViewColumn[] = [
        {
            name: 'notes'
        },
        {
            name: 'wastes',
            title: 'Ingredients Used',
            component: history => (<Fragment>
                {history.wastes.map((waste: Waste) => {
                    return (<div>{ waste.ingredientName } - {waste.quantity} {waste.ingredientUnit}</div>)
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
        disabled: dish => !dish.withHistory
    },{
        icon: <AiOutlineEdit />,
        onClick: dish => {
            this.setState({
                persister: {
                    intent: 'edit',
                    open: true,
                    dish,
                    controls: this.ingredientLinePlugin.preloadIngredientLineControls(dish)
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
        this.ingredientService = props.container.get(IngredientService);
        this.historyService = props.container.get(HistoryService);

        this.state = {
            data: [],
            ingredients: []
        }
    }

    componentDidMount() {
        this.ingredientService.getAllLightweight().subscribe(ingredients => {
            this.setState({
                ingredients
            })
        });
    }
    
    private renderIngredient(requiredIngredient: RequiredIngredient, i: number): ReactElement {

        const requiredQuantity = requiredIngredient.quantity;
        const availableQuantity = requiredIngredient.ingredient!.quantity;
        const name = requiredIngredient.ingredient!.name;
        const unit = requiredIngredient.ingredient!.unit;

        const notEnoughClass = requiredQuantity > availableQuantity 
            ? this.props.classes.noIngredient 
            : undefined;

        return <div key={`i-${i}`} className={notEnoughClass}>
            {name} - {requiredQuantity} {unit}
        </div>
    }

    openPersister(intent: string) {
        this.setState({
            persister: cloneWith(this.state.persister, {
                intent,
                open: true,
                controls: this.ingredientLinePlugin.getControlsWithFreshIngredientLines()
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

        const payload: DishToPersist = {
            name: data['name'],
            notes: data['notes'],
            requiredIngredients: this.ingredientLinePlugin.extractWastes(data)
        };

        const intent = this.state.persister!.intent;
    
        if (intent === 'edit') {
            const dish = this.state.persister!.dish!;

            return this.dishService.update(dish.id, payload).pipe(
                tap(updated => {
                    transferTo(updated, dish);
                    this.setState({ data: cloneArray(this.state.data) });
                })
            );
        }

        return this.dishService.create(payload).pipe(
            tap(dish => {
                this.setState({
                    data: cloneArrayWith(this.state.data, dish)
                });
            })
        );
    }

    validatePersister(result: DataFormResult) {
        return this.ingredientLinePlugin.afterValidate(result, {});
    }

    private definePersisterControls(dish?: Dish): DataFormControl[] {

        dish = dish || this.state.persister?.dish;

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

    private definePersisterLayout(renderers: DataFormRendererRegistry): ReactElement {
        return (<Fragment>
            { renderers['name']() }
            <Box m={2} />
            { renderers['notes']() }
            <Box m={2} />
            { this.ingredientLinePlugin.renderIngredientLines(renderers) }
        </Fragment>);
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

    render() {
        
        const { data } = this.state;

        return (<Fragment>
            <DataPaper>
                <DataView
                    data={data}
                    paged={this.paged}
                    actions={this.actions}
                    columns={this.columns} />
                    <DataActionArea onCreate={() => this.openPersister('create')} />
            </DataPaper>
            {this.state.persister && (<PopupForm size="sm"
                touched={this.state.persister!.touched }
                layout={this.definePersisterLayout.bind(this)}
                controls={this.state.persister!.controls}
                onClose={this.closePersister.bind(this)}
                onSubmit={this.submitPersister.bind(this)}
                open={this.state.persister!.open}
                onValidate={this.validatePersister.bind(this)}
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
        </Fragment>);
    }
}

export default withStyles(styles)(DishView);