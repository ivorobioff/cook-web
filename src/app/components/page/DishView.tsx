import React, { Component, Fragment, ReactElement } from "react";
import { withStyles, createStyles, Theme, Box, Grid, IconButton } from "@material-ui/core";
import DataActionArea from "../../../support/data/components/DataActionArea";
import DataPaper from "../../../support/data/components/DataPaper";
import DataView, { DataViewColumn, DataViewPaged } from "../../../support/data/components/DataView";
import Container from "../../../support/ioc/Container";
import Dish, { DishToPersist, RequiredIngredient } from "../../models/Dish";
import Ingredient from "../../models/Ingredient";
import DishService from "../../services/DishService";
import { DataFormControl, DataFormRendererRegistry, DataFormResult } from "../../../support/form/components/DataForm";
import { cloneArrayWith, cloneWith } from "../../../support/random/utils";
import { tap } from "rxjs/operators";
import PopupForm from "../../../support/modal/components/PopupForm";
import IngredientService from "../../services/IngredientService";
import { toNumber } from "../../../support/mapping/converters";
import { checkPositiveInt } from "../../../support/validation/validators";
import { GrFormClose, GrFormAdd } from 'react-icons/gr'
import { v4 as uuid } from 'uuid';

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
    lineButton: {
        padding: 3
    },
    lineButtonIcon: {
        width: 18,
        height: 18
    }
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
                controls: this.defineIngredientLineControls(this.defineCreatorControls(),  {
                    action: 'fresh',
                    lineId: uuid()
                })
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

        const quantities: {[name: string]: string} = {};
        const ingredientIds: {[name: string]: string} = {};

        Object.keys(data).forEach(key => {
            if (key.startsWith('ingredient_')) {
                ingredientIds[key.split('_')[1]] = data[key];
            }

            if (key.startsWith('quantity_')) {
                quantities[key.split('_')[1]] = data[key];
            }
        });

        const requiredIngredients: RequiredIngredient[] = Object.keys(ingredientIds).map(key => ({
            ingredientId: ingredientIds[key],
            quantity: parseInt(quantities[key])
        }));

        const payload: DishToPersist = {
            name: data['name'],
            notes: data['notes'],
            requiredIngredients
        };

        return this.dishService.create(payload).pipe(
            tap(dish => {
                this.setState({
                    data: cloneArrayWith(this.state.data, dish)
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
            required: true,
            extra: { multiline: true }
        }];
    }

    private defineIngredientLineControls(controls: DataFormControl[], options: {
        action: 'fresh' | 'add' | 'remove' | 'update',
        lineId: string,
        unit?: string
    }): DataFormControl[] {
        const ingredientValues = ingredientsToValues(this.state.ingredients);
        const lineId = options.lineId;

        const ingredientName = 'ingredient_' + lineId;
        const quantityName = 'quantity_' + lineId; 

        const oldIngredientLineControls = options.action === 'fresh' ? [] : this.state.create!.controls
            .filter(control => control.name.startsWith('ingredient_') || control.name.startsWith('quantity_'));

        oldIngredientLineControls.forEach(control => {
            if (options.action !== 'remove' || (control.name !== ingredientName && control.name !== quantityName)) {
                controls.push(control);   
            }

            if (options.action === 'update') {
                if (control.name === quantityName) {
                    if (options.unit) {
                        control.label = `Quantity (${options.unit})`;
                    } else {
                        control.label = 'Quantity';
                    }
                }
            }
        });

        if (['fresh', 'add'].includes(options.action)) {
            controls.push({
                type: 'autocomplete',
                label: 'Ingredient',
                name: ingredientName,
                values: ingredientValues,
                onInput: v => {
                    this.setState({
                        create: cloneWith(this.state.create, {
                            controls: this.defineIngredientLineControls(this.defineCreatorControls(), {
                                action: 'update',
                                lineId,
                                unit: v ? this.state.ingredients.find(ingredient => ingredient.id === v)!.unit : undefined
                            })
                        })
                    });
                },
                required: true
            });
    
            controls.push({
                type: 'text',
                label: 'Quantity',
                name: quantityName,
                validate: checkPositiveInt,
                convertOut: toNumber,
                required: true
            });
        }

        return controls;
    }

    private definePersisterLayout(renderers: DataFormRendererRegistry): ReactElement {
        const ingredientLineIds = this.state.create!.controls
            .filter(control => control.name.startsWith('ingredient_'))
            .map(control => control.name.split('_')[1]);

        return (<Fragment>
            { renderers['name']() }
            <Box m={2} />
            { renderers['notes']() }
            <Box m={2} />
            { ingredientLineIds.map((lineId, i) => {
                return (<Grid key={i} container spacing={1}>
                    <Grid item md={7}>
                        { renderers['ingredient_' + lineId]() }
                    </Grid>
                    <Grid item md={4}>
                        { renderers['quantity_' + lineId]() }

                    </Grid>
                    <Grid item md={1} style={{textAlign: "center"}}>
                        { ingredientLineIds.length > 1 && (<Box display="block" mt={1}>
                            <IconButton onClick={this.removeIngredientLineControls.bind(this, lineId)} className={this.props.classes.lineButton } >
                                <GrFormClose className={this.props.classes.lineButtonIcon } />
                            </IconButton>
                        </Box>)}
                        
                        { i === 0 && (<Box mb={4} />)}
                        
                        { i === (ingredientLineIds.length - 1) && (<Box display="block">
                            <IconButton onClick={this.addIngredientLineControls.bind(this)} className={this.props.classes.lineButton } >
                                <GrFormAdd className={this.props.classes.lineButtonIcon } color="#757575" />
                            </IconButton>
                        </Box>) }
                        
                    </Grid>
                </Grid>)
            }) }
        </Fragment>);
    }

    removeIngredientLineControls(lineId: string) {        
        this.setState({
            create: cloneWith(this.state.create, {
                controls: this.defineIngredientLineControls(this.defineCreatorControls(), {
                    action: 'remove',
                    lineId
                })
            })
        });
    }

    addIngredientLineControls() {
        this.setState({
            create: cloneWith(this.state.create, {
                controls: this.defineIngredientLineControls(this.defineCreatorControls(),{
                    action: 'add',
                    lineId: uuid()
                })
            })
        });
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
            {this.state.create && (<PopupForm size="sm"
                layout={this.definePersisterLayout.bind(this)}
                controls={this.state.create!.controls}
                onClose={this.closeCreator.bind(this)}
                onSubmit={this.submitCreator.bind(this)}
                open={this.state.create!.open}
                title="Dish - Create" />) }
        </Fragment>);
    }
}

export default withStyles(styles)(DishView);