export default interface Ingredient {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    usedByDish?: boolean;
}

export interface IngredientToPersist {
    name: string;
    quantity: number;
    unit: string;
}