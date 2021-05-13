
export interface Ingredient {
    name: string;
    quantity: string;
}

export interface IngredientToPersist {
    name: string;
    quantity: string;
}

export default interface Dish {
    id: string;
    name: string;
    notes: string;
    ingredients: Ingredient[];
    lastFinishedAt?: string;
}

export interface DishToPersist {
    name: string;
    notes: string;
    ingredients: IngredientToPersist[];
}