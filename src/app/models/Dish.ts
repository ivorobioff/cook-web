import Ingredient from "./Ingredient";

export default interface Dish {
    id: string;
    name: string;
    notes: string;
    ingredients?: Ingredient[];
}

export interface DishToPersist {
    name: string;
    notes: string;
    ingredientIds: string[];
}