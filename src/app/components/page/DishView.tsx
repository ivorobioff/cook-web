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
import { AiFillDelete, AiOutlineEdit } from "react-icons/ai";
import Confirmation from "../../../support/modal/components/Confirmation";
import IngredientLinePlugin, { ingredientLineStyles } from "../plugins/IngredientLinePlugin";

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

    actions: DataViewAction[] = [{
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
            requiredIngredients: this.ingredientLinePlugin.extractRequiredIngredients(data)
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
                title={`Dish - ${ucFirst(this.state.persister!.intent)}`} />) } 

            {this.state.remove && (<Confirmation
                onClose={this.closeRemoveConfirmation.bind(this)}
                onHandle={this.handleRemoveConfirmation.bind(this)}
                confirmButtonTitle="Proceed"
                open={this.state.remove!.open}
                title="Dish - Delete">
                {`You are about to delete "${this.state.remove!.dish.name}". Do you want to proceed?`}
            </Confirmation>)}
        </Fragment>);
    }
}

export default withStyles(styles)(DishView);