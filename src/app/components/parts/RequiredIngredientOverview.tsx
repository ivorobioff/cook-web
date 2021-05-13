import React, { Component, Fragment, ReactElement } from "react";
import { Theme, withStyles } from "@material-ui/core";
import { createStyles } from "@material-ui/styles";
import Dish, { Ingredient } from "../../models/Dish";

const styles = (theme: Theme) => createStyles({
    
});

export interface RequiredIngredientOverviewProps {
    classes: {[name: string] : string};
    dish: Dish;
}

export interface RequiredIngredientOverviewState {

}

class RequiredIngredientOverview extends Component<RequiredIngredientOverviewProps, RequiredIngredientOverviewState> {

    private renderIngredient(ingredient: Ingredient, i: number): ReactElement {

        const quantity = ingredient.quantity;
        const name = ingredient!.name;

        return <div key={`i-${i}`}>{name} - {quantity}</div>
    }


    render() {
        return (<Fragment>
            {this.props.dish.ingredients!.map(this.renderIngredient.bind(this))}
        </Fragment>);
    }
}

export default withStyles(styles)(RequiredIngredientOverview);