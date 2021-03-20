import React, { Component, Fragment, ReactElement } from "react";
import { withStyles, createStyles, Theme } from "@material-ui/core";
import DataActionArea from "../../../support/data/components/DataActionArea";
import DataPaper from "../../../support/data/components/DataPaper";
import DataView, { DataViewColumn, DataViewPaged } from "../../../support/data/components/DataView";
import Container from "../../../support/ioc/Container";
import Dish, { DishToPersist, RequiredIngredient } from "../../models/Dish";
import Ingredient from "../../models/Ingredient";
import DishService from "../../services/DishService";
import { DataFormControl, DataFormResult } from "../../../support/form/components/DataForm";
import { cloneArrayWith, cloneWith } from "../../../support/random/utils";
import { tap } from "rxjs/operators";
import PopupForm from "../../../support/modal/components/PopupForm";
import IngredientService from "../../services/IngredientService";
import { toNumber } from "../../../support/mapping/converters";
import { checkPositiveInt } from "../../../support/validation/validators";


interface DishProps {
    container: Container;
    classes: {[name: string]:string};
}

interface DishState {
    data: Dish[],
    ingredients: Ingredient[],
    edit?: {
        ingredient: Ingredient;
        open: boolean;
        controls: DataFormControl[];
    },
    create?: {
        open: boolean;
        controls: DataFormControl[];
    },
    remove?: {
        open: true,
        ingredient: Ingredient
    },
}

const styles = (theme: Theme) => createStyles({
    noIngredient: {
        color: theme.palette.error.dark
    },
});

function ingredientsToValues(ingredients: Ingredient[]): {[name: string]: string} {
    const result: {[name: string]: string} = {};
    
    ingredients.forEach(ingredient => result[ingredient.id] = ingredient.name);

    return result;
}

class DishView extends Component<DishProps, DishState> {

    private dishService: DishService;
    private ingredientService: IngredientService;

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
        return this.dishService.create(data as DishToPersist).pipe(
            tap(dish => {
                this.setState({
                    data: cloneArrayWith(this.state.data, dish)
                });
            })
        );
    }

    private defineCreatorControls(ingredients: Ingredient[] = []): DataFormControl[] {

        return [{
            type: 'text',
            label: 'Name',
            name: 'name',
            required: true
        }, {
            type: 'text',
            label: 'Notes',
            name: 'notes',
            required: true,
            extra: { multiline: true }
        }, {
            type: 'autocomplete',
            label: 'Ingredients',
            name: 'ingredients',
            values: ingredientsToValues(this.state.ingredients),
            required: true
        }, {
            type: 'text',
            label: 'Quantity',
            name: 'quantity',
            validate: checkPositiveInt,
            convertOut: toNumber,
            required: true

        }];
    }

    render() {
        
        const { data} = this.state;

        return (<Fragment>
            <DataPaper>
                <DataView
                    data={data}
                    paged={this.paged}
                    columns={this.columns} />
                    <DataActionArea onCreate={this.openCreator.bind(this)} />
            </DataPaper>
            {this.state.create && (<PopupForm
                controls={this.state.create!.controls}
                onClose={this.closeCreator.bind(this)}
                onSubmit={this.submitCreator.bind(this)}
                open={this.state.create!.open}
                title="Ingredient - Create" />) }
        </Fragment>);
    }
}

export default withStyles(styles)(DishView);