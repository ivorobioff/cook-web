import Ingredient from "../models/Ingredient";

let _ingredients: Ingredient[] = [];
let _ingredientValues: {[name: string]: string}  = {};

export function ingredientsToValues(ingredients: Ingredient[]): {[name: string]: string} {

    if (_ingredients === ingredients) {
        return _ingredientValues;
    }

    _ingredients = ingredients;

    _ingredientValues = {};
    
    ingredients.forEach(ingredient => _ingredientValues[ingredient.id] = ingredient.name);

    return _ingredientValues;
}