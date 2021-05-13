import { Ingredient } from "./Dish";

export default interface History {
    id: string;
    dishId: string;
    notes: string;
    scheduledOn: string;
    finishedAt: string;
    ingredients: Ingredient[];
}