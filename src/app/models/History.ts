export interface Waste {
    ingredient: string;
    quantity: string;
}

export default interface History {
    id: string;
    dishId: string;
    notes: string;
    scheduledOn: string;
    finishedAt: string;
    wastes: Waste[];
}