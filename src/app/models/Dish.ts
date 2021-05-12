
export interface RequiredIngredient {
    name: string;
    quantity: number;
}

export interface RequiredIngredientToPersist {
    name: string;
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