import React, { Component, Fragment, ReactElement } from "react";
import { Theme, withStyles } from "@material-ui/core";
import { createStyles } from "@material-ui/styles";
import Dish, { RequiredIngredient } from "../../models/Dish";

const styles = (theme: Theme) => createStyles({
    noIngredient: {
        color: theme.palette.error.dark
    }
});

export interface RequiredIngredientOverviewProps {
    classes: {[name: string] : string};
    dish: Dish;
}

export interface RequiredIngredientOverviewState {

}

class RequiredIngredientOverview extends Component<RequiredIngredientOverviewProps, RequiredIngredientOverviewState> {

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


    render() {
        return (<Fragment>
            {this.props.dish.requiredIngredients!.map(this.renderIngredient.bind(this))}
        </Fragment>);
    }
}

export default withStyles(styles)(RequiredIngredientOverview);