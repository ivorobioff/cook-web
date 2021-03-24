import Ingredient from "./Ingredient";

export interface RequiredIngredient {
    ingredient?: Ingredient;
    ingredientId: string;
    quantity: number;
}

export interface RequiredIngredientToPersist {
    ingredientId: string;
    quantity: number;
}

export default interface Dish {
    id: string;
    name: string;
    notes: string;
    requiredIngredients: RequiredIngredient[];
    lastFinishedAt?: string;
}

export interface DishToPersist {
    name: string;
    notes: string;
    requiredIngredients: RequiredIngredientToPersist[];
}