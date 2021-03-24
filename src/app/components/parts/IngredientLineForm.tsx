import React, { Component, Fragment, ReactElement } from 'react';
import DataForm, { DataFormCommonProps, DataFormControl, DataFormHook, DataFormRendererRegistry, DataFormResult } from '../../../support/form/components/DataForm';
import Dish, { RequiredIngredient } from '../../models/Dish';
import Ingredient from '../../models/Ingredient';
import { v4 as uuid } from 'uuid';
import { checkPositiveInt } from '../../../support/validation/validators';
import { toNumber } from '../../../support/mapping/converters';
import { Box, createStyles, Grid, IconButton, Theme, withStyles } from '@material-ui/core';
import { GrFormAdd, GrFormClose } from 'react-icons/gr';
import { cloneExcept } from '../../../support/random/utils';

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

export interface IngredientLineFormProps extends DataFormCommonProps {
    dish: Dish;
    ingredients: Ingredient[];
    classes: {[name: string]: string};
}

interface IngredientLineFormState {
    controls: DataFormControl[];
}

const styles = (theme: Theme) => createStyles({
    lineButton: {
        padding: 3
    },
    lineButtonIcon: {
        width: 18,
        height: 18
    }
});

class IngredientLineForm extends Component<IngredientLineFormProps, IngredientLineFormState> {

    private hook = new DataFormHook();

    constructor(props: IngredientLineFormProps) {
        super(props);

        this.state = {
            controls: this.props.dish 
                ? this.createControlsFromDish(this.props.dish)
                :  this.createControls(uuid()) 
        }

        if (this.props.hook) {
            this.props.hook.provider = () => {
                const provider = this.hook.provider!
                const data = provider();

                if (!data) {
                    return data;
                }

                return { wastes: this.extractWastes(data) }
            }
        }
    }

    componentDidUpdate(prevProps: IngredientLineFormProps) {

        let controls = this.state.controls;

        if (this.props.dish !== prevProps.dish) {
            controls = this.createControlsFromDish(this.props.dish);
        }

        if (this.props.ingredients !== prevProps.ingredients) {
            controls = [];
            this.state.controls.forEach(control => {
                control.values = ingredientsToValues(this.props.ingredients);
                controls.push(control);
            });
        }

        if (controls !== this.state.controls) {
            this.setState({ controls });
        }
    }
    

    private defineControls(options: {
        action: 'fresh' | 'add' | 'remove' | 'update',
        lineId: string,
        unit?: string,
        requiredIngredients?: RequiredIngredient[]
    }): DataFormControl[] {

        const controls: DataFormControl[] = [];
        const lineId = options.lineId;

        const ingredientName = makeIngredientName(lineId);
        const quantityName = makeQuantityName(lineId); 

        const oldIngredientLineControls = options.action === 'fresh' ? [] : this.state.controls
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
            this.createControls(lineId).forEach(control => controls.push(control))
        }

        return controls;
    }

    private createControls(lineId: string, requiredIngredient?: RequiredIngredient): DataFormControl[] {
        return [
            {
                type: 'autocomplete',
                label: 'Ingredient',
                name: makeIngredientName(lineId),
                values: ingredientsToValues(this.props.ingredients),
                onInput: (v: any) => {
                    this.setState({
                        controls: this.defineControls({
                            action: 'update',
                            lineId,
                            unit: v ? this.props.ingredients.find(ingredient => ingredient.id === v)!.unit : undefined
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

    private createControlsFromDish(dish: Dish) {

        const controls: DataFormControl[] = [];

        dish.requiredIngredients.forEach(requiredIngredient => {
            this.createControls(uuid(), requiredIngredient)
                .forEach(control => controls.push(control));
        });

        return controls
    }

    private removeIngredientLineControls(lineId: string) {        
        this.setState({
            controls: this.defineControls({
                action: 'remove',
                lineId
            })
        });

        this.touch();
    }

    private addIngredientLineControls() {
        this.setState({
            controls: this.defineControls({
                action: 'add',
                lineId: uuid()
            })
        });

        this.touch();
    }

    private extractWastes(data: DataFormResult): { ingredientId: string; quantity: number }[] {
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
    
    createLayout(renderers: DataFormRendererRegistry): ReactElement {
        const ingredientLineIds = this.state.controls
            .filter(control => control.name.startsWith('ingredient_'))
            .map(control => control.name.split('_')[1]);
            
        return (<Fragment>
            {ingredientLineIds.map((lineId, i) => {
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
                                className={this.props.classes.lineButton } >
                            <GrFormClose className={this.props.classes.lineButtonIcon } />
                        </IconButton>
                    </Box>)}
                    
                    { i === 0 && (<Box mb={4} />)}
                    
                    { i === (ingredientLineIds.length - 1) && (<Box display="block">
                        <IconButton onClick={this.addIngredientLineControls.bind(this)} 
                                className={this.props.classes.lineButton } >
                            <GrFormAdd className={this.props.classes.lineButtonIcon } color="#757575" />
                        </IconButton>
                    </Box>) }
                    
                </Grid>
            </Grid>)
        })}
        </Fragment>);
    }

    touch() {
        if (this.props.onTouch) {
            this.props.onTouch();
        }
    }
    
    render() {

        const props = cloneExcept(this.props, 'onReady');

        return (<DataForm {...props}
            hook={this.hook}
            controls={this.state.controls} 
            layout={this.createLayout.bind(this)} />);
    }
}

export default withStyles(styles)(IngredientLineForm);