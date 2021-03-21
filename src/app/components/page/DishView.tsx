import React, { Component, Fragment, ReactElement } from "react";
import { withStyles, createStyles, Theme, Box, Grid, IconButton } from "@material-ui/core";
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
import { toBlankIfNull, toNumber } from "../../../support/mapping/converters";
import { checkPositiveInt } from "../../../support/validation/validators";
import { GrFormClose, GrFormAdd } from 'react-icons/gr'
import { v4 as uuid } from 'uuid';
import { AiFillDelete, AiOutlineEdit } from "react-icons/ai";
import Confirmation from "../../../support/modal/components/Confirmation";

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

function makeQuantityLabel(unit?: string): string {
    return unit ? `Quantity (${unit})` : 'Quantity';
}

function makeQuantityName(lineId: string) {
    return 'quantity_' + lineId;
}

function makeIngredientName(lineId: string) {
    return 'ingredient_' + lineId;
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

    actions: DataViewAction[] = [{
        icon: <AiOutlineEdit />,
        onClick: dish => {
            this.setState({
                persister: {
                    intent: 'edit',
                    open: true,
                    dish,
                    controls: this.preloadIngredientLineControls(this.definePersisterControls(dish), dish)
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
                controls: this.defineIngredientLineControls(this.definePersisterControls(),  {
                    action: 'fresh',
                    lineId: uuid()
                })
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
            convertOut: toBlankIfNull,
            value: dish?.notes,
            extra: { multiline: true }
        }];
    }

    private preloadIngredientLineControls(controls: DataFormControl[], dish: Dish) {

        const ingredientValues = ingredientsToValues(this.state.ingredients);

        dish.requiredIngredients.forEach(requiredIngredient => {
            this.createIngredientLineControls(uuid(), {
                ingredientValues,
                requiredIngredient
            }).forEach(control => controls.push(control));
        });

        return controls
    }

    private defineIngredientLineControls(controls: DataFormControl[], options: {
        action: 'fresh' | 'add' | 'remove' | 'update',
        lineId: string,
        unit?: string,
        requiredIngredients?: RequiredIngredient[]
    }): DataFormControl[] {
        const ingredientValues = ingredientsToValues(this.state.ingredients);
        const lineId = options.lineId;

        const ingredientName = makeIngredientName(lineId);
        const quantityName = makeQuantityName(lineId); 

        const oldIngredientLineControls = options.action === 'fresh' ? [] : this.state.persister!.controls
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
            this.createIngredientLineControls(lineId, { ingredientValues }).forEach(control => controls.push(control))
        }

        return controls;
    }

    private createIngredientLineControls(lineId: string, options: {
        ingredientValues: {[name: string]: string},
        requiredIngredient?: RequiredIngredient
    }) {
        return [
            {
                type: 'autocomplete',
                label: 'Ingredient',
                name: makeIngredientName(lineId),
                values: options.ingredientValues,
                onInput: (v: any) => {
                    this.setState({
                        persister: cloneWith(this.state.persister, {
                            controls: this.defineIngredientLineControls(this.definePersisterControls(), {
                                action: 'update',
                                lineId,
                                unit: v ? this.state.ingredients.find(ingredient => ingredient.id === v)!.unit : undefined
                            })
                        })
                    });
                },
                required: true,
                value: options?.requiredIngredient?.ingredientId
            },
            {
                type: 'text',
                label: makeQuantityLabel(options?.requiredIngredient?.ingredient?.unit),
                name: makeQuantityName(lineId),
                validate: checkPositiveInt,
                convertOut: toNumber,
                required: true,
                value: options?.requiredIngredient?.quantity
            }
        ];
    }

    private definePersisterLayout(renderers: DataFormRendererRegistry): ReactElement {
        const ingredientLineIds = this.state.persister!.controls
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
            persister: cloneWith(this.state.persister, {
                controls: this.defineIngredientLineControls(this.definePersisterControls(), {
                    action: 'remove',
                    lineId
                }),
                touched: true
            })
        });
    }

    addIngredientLineControls() {
        this.setState({
            persister: cloneWith(this.state.persister, {
                controls: this.defineIngredientLineControls(this.definePersisterControls(),{
                    action: 'add',
                    lineId: uuid()
                }),
                touched: true
            })
        });
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
        
        const { data} = this.state;

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