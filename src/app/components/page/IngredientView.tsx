import React, { Component, Fragment } from "react"
import DataActionArea from "../../../support/data/components/DataActionArea";
import DataPaper from "../../../support/data/components/DataPaper";
import DataView, { DataViewAction, DataViewColumn, DataViewPaged } from "../../../support/data/components/DataView";
import Container from "../../../support/ioc/Container";
import Ingredient, { IngredientToPersist } from "../../models/Ingredient";
import IngredientService from "../../services/IngredientService";
import {AiFillDelete, AiOutlineEdit} from "react-icons/ai";
import { DataFormControl, DataFormResult } from "../../../support/form/components/DataForm";
import { cloneArray, cloneArrayExcept, cloneArrayWith, cloneWith, transferTo } from "../../../support/random/utils";
import { tap } from "rxjs/operators";
import { checkZeroOrPositiveInt } from "../../../support/validation/validators";
import { toNumber } from "../../../support/mapping/converters";
import PopupForm from "../../../support/modal/components/PopupForm";
import Confirmation from "../../../support/modal/components/Confirmation";
import { textFilter } from "../../../support/data/components/query/controls";


interface IngredientProps {
    container: Container;
}

interface IngredientState {
    data: Ingredient[],
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

export default class IngredientView extends Component<IngredientProps, IngredientState> {

    private ingredientService: IngredientService;

    columns: DataViewColumn[] = [
        {
            name: 'name',
            query: {
                controls: [
                    textFilter('name')
                ]
            }
        },
        {
            name: 'quantity',
            color: quantity => quantity < 1 ? 'error' : null
        },
        {
            name: 'unit'
        }
    ];

    actions: DataViewAction[] = [{
        icon: <AiOutlineEdit />,
        onClick: ingredient => {
            this.setState({
                edit: {
                    open: true,
                    ingredient,
                    controls: this.defineEditorControls(ingredient)
                }
            });
        }
    }, {
        icon: <AiFillDelete />,
        onClick: ingredient => {
            this.setState({
                remove: {
                    open: true,
                    ingredient
                }
            });
        },
        disabled: ingredient => ingredient.usedByDish
    }];

    private paged: DataViewPaged = {
        onChange: (offset, limit, filter?) => {
            return this.ingredientService.getAll(offset, limit, filter).pipe(
                tap(data => this.setState({ data }), error => this.setState({ data: [] }))
            );
        }
    };
    
    constructor(props: IngredientProps) {
        super(props);

        this.ingredientService = props.container.get(IngredientService);

        this.state = {
            data: []
        }
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
        return this.ingredientService.create(data as IngredientToPersist).pipe(
            tap(ingredient => {
                this.setState({
                    data: cloneArrayWith(this.state.data, ingredient)
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
            label: 'Quantity',
            name: 'quantity',
            validate: checkZeroOrPositiveInt,
            convertOut: toNumber,
            required: true

        }, {
            type: 'text',
            label: 'Unit',
            name: 'unit',
            required: true
        }];
    }

    private defineEditorControls(ingredient: Ingredient): DataFormControl[] {
        return [{
            type: 'text',
            label: 'Name',
            name: 'name',
            required: true,
            value: ingredient.name
        }, {
            type: 'text',
            label: 'Quantity',
            name: 'quantity',
            validate: checkZeroOrPositiveInt,
            convertOut: toNumber,
            required: true,
            value: ingredient.quantity

        }, {
            type: 'text',
            label: 'Unit',
            name: 'unit',
            required: true,
            value: ingredient.unit
        }];
    }

    closeEditor() {
        this.setState({
            edit: cloneWith(this.state.edit, {
                open: false
            })
        });
    }

    submitEditor(data: DataFormResult) {

        let ingredient = this.state.edit!.ingredient;

        return this.ingredientService.update(ingredient.id, data as IngredientToPersist).pipe(
            tap(() => {
                transferTo(data, ingredient);
                this.setState({ data: cloneArray(this.state.data) });
            })
        )
    }

    closeRemoveConfirmation() {
        this.setState({
            remove: cloneWith(this.state.remove, {
                open: false
            })
        });
    }

    handleRemoveConfirmation() {

        let ingredient = this.state.remove!.ingredient;

        return this.ingredientService.remove(ingredient.id).pipe(
            tap(() => {
                this.setState({
                    data: cloneArrayExcept(this.state.data, ingredient)
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
                    <DataActionArea onCreate={this.openCreator.bind(this)} />
            </DataPaper>
            {this.state.create && (<PopupForm
                controls={this.state.create!.controls}
                onClose={this.closeCreator.bind(this)}
                onSubmit={this.submitCreator.bind(this)}
                open={this.state.create!.open}
                title="Ingredient - Create" />) }
            
            {this.state.remove && (<Confirmation
                onClose={this.closeRemoveConfirmation.bind(this)}
                onHandle={this.handleRemoveConfirmation.bind(this)}
                confirmButtonTitle="Proceed"
                open={this.state.remove!.open}
                title="Ingredient - Delete">
                {`You are about to delete "${this.state.remove!.ingredient.name}". Do you want to proceed?`}
            </Confirmation>)}

            {this.state.edit && (<PopupForm
                controls={this.state.edit!.controls}
                onClose={this.closeEditor.bind(this)}
                onSubmit={this.submitEditor.bind(this)}
                open={this.state.edit!.open}
                title="Ingredient - Update" />) }

        </Fragment>);
    }
}