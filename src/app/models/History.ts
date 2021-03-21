export interface Waste {
    ingredientName: string;
    ingredientUnit: string;
    quantity: number;
}

export default interface History {
    id: string;
    dishId: string;
    notes: string;
    scheduledOn: string;
    finishedAt: string;
    wastes: Waste[];
}