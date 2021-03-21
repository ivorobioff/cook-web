import { Box, Grid, IconButton } from "@material-ui/core";
import React, { ReactElement } from "react";
import { GrFormAdd, GrFormClose } from "react-icons/gr";
import { DataFormControl, DataFormErrors, DataFormRendererRegistry, DataFormResult } from "../../../support/form/components/DataForm";
import { v4 as uuid } from 'uuid';
import Dish, { RequiredIngredient } from "../../models/Dish";
import Ingredient from "../../models/Ingredient";
import { checkPositiveInt } from "../../../support/validation/validators";
import { toNumber } from "../../../support/mapping/converters";

export interface Waste {
    ingredientId: string;
    quantity: number;
}

function makeQuantityLabel(unit?: string): string {
    return unit ? `Quantity (${unit})` : 'Quantity';
}

function makeQuantityName(lineId: string) {
    return 'quantity_' + lineId;
}

function makeIngredientName(lineId: string) {
    return 'ingredient_' + lineId;
}

let _ingredients: Ingredient[] = [];
let _ingredientValues: {[name: string]: string}  = {};

function ingredientsToValues(ingredients: Ingredient[]): {[name: string]: string} {

    if (_ingredients === ingredients) {
        return _ingredientValues;
    }

    _ingredients = ingredients;

    _ingredientValues = {};
    
    ingredients.forEach(ingredient => _ingredientValues[ingredient.id] = ingredient.name);

    return _ingredientValues;
}

export const ingredientLineStyles = {
    lineButton: {
        padding: 3
    },
    lineButtonIcon: {
        width: 18,
        height: 18
    }
}

export default class IngredientLinePlugin {
    
    constructor(
        private getState: () => { 
            controls: DataFormControl[], 
            ingredients: Ingredient[]
        },

        private setState: (attributes: {[name:string]: any}) => void,

        private defineCommonControls: (dish?: Dish) => DataFormControl[],
        private classes: {[name: string]: string}
    ) { }
    
    getControlsWithFreshIngredientLines(): DataFormControl[] {
        return this.defineIngredientLineControls(this.defineCommonControls(),  {
            action: 'fresh',
            lineId: uuid()
        });
    }

    preloadIngredientLineControls(dish: Dish) {

        const controls = this.defineCommonControls(dish);

        dish.requiredIngredients.forEach(requiredIngredient => {
            this.createIngredientLineControls(uuid(), requiredIngredient)
                .forEach(control => controls.push(control));
        });

        return controls
    }

    renderIngredientLines(renderers: DataFormRendererRegistry): ReactElement[] {
        const ingredientLineIds = this.getState().controls
            .filter(control => control.name.startsWith('ingredient_'))
            .map(control => control.name.split('_')[1]);
            
        return ingredientLineIds.map((lineId, i) => {
            return (<Grid key={i} container spacing={1}>
                <Grid item md={7}>
                    { renderers['ingredient_' + lineId]() }
                </Grid>
                <Grid item md={4}>
                    { renderers['quantity_' + lineId]() }

                </Grid>
                <Grid item md={1} style={{textAlign: "center"}}>
                    { ingredientLineIds.length > 1 && (<Box display="block" mt={1}>
                        <IconButton onClick={this.removeIngredientLineControls.bind(this, lineId)} 
                                className={this.classes.lineButton } >
                            <GrFormClose className={this.classes.lineButtonIcon } />
                        </IconButton>
                    </Box>)}
                    
                    { i === 0 && (<Box mb={4} />)}
                    
                    { i === (ingredientLineIds.length - 1) && (<Box display="block">
                        <IconButton onClick={this.addIngredientLineControls.bind(this)} 
                                className={this.classes.lineButton } >
                            <GrFormAdd className={this.classes.lineButtonIcon } color="#757575" />
                        </IconButton>
                    </Box>) }
                    
                </Grid>
            </Grid>)
        })
    }

    extractWastes(data: DataFormResult): Waste[] {
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

        return Object.keys(ingredientIds).map(key => ({
            ingredientId: ingredientIds[key],
            quantity: parseInt(quantities[key])
        }));
    }

    private removeIngredientLineControls(lineId: string) {        
        this.setState({
            controls: this.defineIngredientLineControls(this.defineCommonControls(), {
                action: 'remove',
                lineId
            }),
            touched: true
        });
    }

    private addIngredientLineControls() {
        this.setState({
            controls: this.defineIngredientLineControls(this.defineCommonControls(),{
                action: 'add',
                lineId: uuid()
            }),
            touched: true
        })
    }

    private defineIngredientLineControls(controls: DataFormControl[], options: {
        action: 'fresh' | 'add' | 'remove' | 'update',
        lineId: string,
        unit?: string,
        requiredIngredients?: RequiredIngredient[]
    }): DataFormControl[] {
        const lineId = options.lineId;

        const ingredientName = makeIngredientName(lineId);
        const quantityName = makeQuantityName(lineId); 

        const oldIngredientLineControls = options.action === 'fresh' ? [] : this.getState().controls
            .filter(control => control.name.startsWith('ingredient_') || control.name.startsWith('quantity_'));

        oldIngredientLineControls.forEach(control => {
            if (options.action !== 'remove' || (control.name !== ingredientName && control.name !== quantityName)) {
                controls.push(control);   
            }

            if (options.action === 'update') {
                if (control.name === quantityName) {
                    control.label = makeQuantityLabel(options.unit);
                }
            }
        });

        if (['fresh', 'add'].includes(options.action)) {
            this.createIngredientLineControls(lineId).forEach(control => controls.push(control))
        }

        return controls;
    }

    private createIngredientLineControls(lineId: string, requiredIngredient?: RequiredIngredient) {
        return [
            {
                type: 'autocomplete',
                label: 'Ingredient',
                name: makeIngredientName(lineId),
                values: ingredientsToValues(this.getState().ingredients),
                onInput: (v: any) => {
                    this.setState({
                        controls: this.defineIngredientLineControls(this.defineCommonControls(), {
                            action: 'update',
                            lineId,
                            unit: v ? this.getState().ingredients.find(ingredient => ingredient.id === v)!.unit : undefined
                        })
                    });
                },
                required: true,
                value: requiredIngredient?.ingredientId
            },
            {
                type: 'text',
                label: makeQuantityLabel(requiredIngredient?.ingredient?.unit),
                name: makeQuantityName(lineId),
                validate: checkPositiveInt,
                convertOut: toNumber,
                required: true,
                value: requiredIngredient?.quantity
            }
        ];
    }

    afterValidate(data: DataFormResult, errors: DataFormErrors): DataFormErrors {

        const ingredientIds: string[] = [];

        Object.keys(data).forEach(key => {
            if (key.startsWith('ingredient_')) {
                const ingredientId = data[key];

                if (ingredientIds.includes(ingredientId)) {
                    errors[key] = 'This is duplicate!';
                } else {
                    ingredientIds.push(ingredientId);
                }
            }
        });

        return errors;
    } 
}