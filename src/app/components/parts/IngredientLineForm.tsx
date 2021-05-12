import React, { Component, Fragment, ReactElement } from 'react';
import DataForm, { DataFormCommonProps, DataFormControl, DataFormErrors, DataFormHook, DataFormRendererRegistry, DataFormResult } from '../../../support/form/components/DataForm';
import Dish, { RequiredIngredient } from '../../models/Dish';
import { v4 as uuid } from 'uuid';
import { Box, createStyles, Grid, IconButton, Theme, withStyles } from '@material-ui/core';
import { GrFormAdd, GrFormClose } from 'react-icons/gr';
import { cloneExcept } from '../../../support/random/utils';

function makeQuantityName(lineId: string) {
    return 'quantity_' + lineId;
}

function makeIngredientName(lineId: string) {
    return 'ingredient_' + lineId;
}

export interface IngredientLineFormProps extends DataFormCommonProps {
    dish?: Dish;
    classes: {[name: string]: string};
    wasteFieldName?: string;
    fromWaste?: (ingredient: string, quantity: string) => {[name: string]: string};
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

                return { [props.wasteFieldName || 'wastes']: this.extractWastes(data) }
            }
        }
    }

    componentDidUpdate(prevProps: IngredientLineFormProps) {

        let controls = this.state.controls;

        if (this.props.dish !== prevProps.dish) {
            controls = this.props.dish 
                ? this.createControlsFromDish(this.props.dish)
                : this.createControls(uuid())
        }

        if (controls !== this.state.controls) {
            this.setState({ controls });
        }
    }
    

    private defineControls(options: {
        action: 'fresh' | 'add' | 'remove',
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
        });

        if (['fresh', 'add'].includes(options.action)) {
            this.createControls(lineId).forEach(control => controls.push(control))
        }

        return controls;
    }

    private createControls(lineId: string, requiredIngredient?: RequiredIngredient): DataFormControl[] {
        return [
            {
                type: 'text',
                label: 'Ingredient',
                name: makeIngredientName(lineId),
                required: true,
                value: requiredIngredient?.name
            },
            {
                type: 'text',
                label: 'Quantity',
                name: makeQuantityName(lineId),
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

    private extractWastes(data: DataFormResult): {[name: string]: string}[] {
        const quantities: {[name: string]: string} = {};
        const ingredients: {[name: string]: string} = {};

        Object.keys(data).forEach(key => {
            if (key.startsWith('ingredient_')) {
                ingredients[key.split('_')[1]] = data[key];
            }

            if (key.startsWith('quantity_')) {
                quantities[key.split('_')[1]] = data[key];
            }
        });

        const fromWaste = this.props.fromWaste

        return Object.keys(ingredients).map(key => {

            const ingredient = ingredients[key];
            const quantity = quantities[key];
    

            if (fromWaste) {
                return fromWaste(ingredient, quantity);
            }

            return { ingredient, quantity };
        });
    }
    
    createLayout(registry: DataFormRendererRegistry): ReactElement {
        const ingredientLineIds = this.state.controls
            .filter(control => control.name.startsWith('ingredient_'))
            .map(control => control.name.split('_')[1]);

        return (<Fragment>
            {ingredientLineIds
                .map((lineId, i) => {
                    return (<Grid key={i} container spacing={1}>
                        <Grid item md={7}>
                            { registry.render('ingredient_' + lineId) }
                        </Grid>
                        <Grid item md={4}>
                            { registry.render('quantity_' + lineId) }

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

    validate(result: DataFormResult): DataFormErrors {
        const errors: DataFormErrors = {};
        
        const ingredients: string[] = [];

        Object.keys(result).forEach(key => {
            if (key.startsWith('ingredient_')) {
                const ingredient = (result[key] as string).toLowerCase();

                if (ingredients.includes(ingredient)) {
                    errors[key] = 'This ingredient is added already!'
                } else {
                    ingredients.push(ingredient);
                }
            }
        });

        return errors;
    }

    touch() {
        if (this.props.onTouch) {
            this.props.onTouch();
        }
    }
    
    render() {

        const props = cloneExcept(this.props, 'onReady');

        return (<DataForm {...props}
            onValidate={this.validate.bind(this)}
            hook={this.hook}
            controls={this.state.controls} 
            layout={this.createLayout.bind(this)} />);
    }
}

export default withStyles(styles)(IngredientLineForm);